"use server";

import { redirect } from "next/navigation";
import {
  isAllowedSchoolEmail,
  schoolEmailHint,
} from "@/lib/auth/school-email";
import { chosenUsername, isUsername, loginUsername, usernameEmail } from "@/lib/auth/username";
import { getSessionUser } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  message?: string;
};

async function createCoreUserProfile(input: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gradeLevel: number;
}) {
  const admin = createAdminClient();
  const schoolName =
    process.env.CHAPTER_SCHOOL_NAME ?? "Newman Smith High School";
  const chapterName = process.env.CHAPTER_NAME ?? "Newman Smith DECA";
  const state = process.env.CHAPTER_STATE ?? "TX";

  const { error } = await admin.rpc("register_core_user", {
    p_user_id: input.id,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_email: input.email,
    p_grade_level: input.gradeLevel,
    p_school_name: schoolName,
    p_chapter_name: chapterName,
    p_state: state,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = loginUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameEmail(username),
    password,
  });

  if (error) {
    return { error: "That username or password is wrong." };
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const gradeLevel = Number(formData.get("gradeLevel"));

  if (!firstName || !lastName || !email || !password) {
    return { error: "All fields are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (![9, 10, 11, 12].includes(gradeLevel)) {
    return { error: "Select a valid grade level." };
  }

  if (!isAllowedSchoolEmail(email)) {
    return { error: schoolEmailHint() };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        grade_level: gradeLevel,
      },
    });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create account." };
  }

  try {
    await createCoreUserProfile({
      id: created.user.id,
      firstName,
      lastName,
      email,
      gradeLevel,
    });
  } catch (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      error:
        profileError instanceof Error
          ? profileError.message
          : "Could not create your profile.",
    };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      message:
        "Account created. Sign in with your email and password to continue.",
    };
  }

  redirect("/dashboard");
}

export async function chooseUsername(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const username = chosenUsername(String(formData.get("username") ?? ""));
  if (!isUsername(username)) {
    return {
      error: "Use 3 to 30 letters and numbers, and start with a letter.",
    };
  }

  const passwordChoice = String(formData.get("passwordChoice") ?? "keep");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (passwordChoice === "change") {
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters." };
    }
    if (password !== confirmPassword) {
      return { error: "Passwords do not match." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_username", {
    p_username: username,
  });

  if (error) {
    const taken = /taken/i.test(error.message);
    return {
      error: taken
        ? "That username is already taken."
        : "Could not save that username. Try again.",
    };
  }

  if (passwordChoice === "change") {
    const admin = createAdminClient();
    const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, {
      password,
    });
    if (passwordError) {
      return { error: "Could not update your password. Try again." };
    }
  }

  redirect("/dashboard");
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = loginUsername(String(formData.get("username") ?? ""));
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = usernameEmail(username);

  if (!username || !lastName) {
    return { error: "Username and last name are required." };
  }

  if (!isUsername(username)) {
    return { error: "That username does not match a chapter account." };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .schema("core")
    .from("users")
    .select("last_name")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    return { error: "Could not verify your account right now. Try again later." };
  }

  if (
    !profile?.last_name ||
    profile.last_name.trim().toLowerCase() !== lastName.toLowerCase()
  ) {
    return { error: "That username and last name do not match our chapter roster." };
  }

  const supabase = await createClient();
  const siteUrl =
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl.replace(/\/$/, "")}/login`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message: `If ${username} is on the chapter roster, a password reset link is on its way. Open it from the same device and choose a new password.`,
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

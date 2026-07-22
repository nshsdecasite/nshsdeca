"use server";

import { redirect } from "next/navigation";
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
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

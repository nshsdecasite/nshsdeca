export function chosenUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function loginUsername(value: string) {
  const local = value.trim().toLowerCase().split("@")[0] ?? "";
  return local.replace(/[^a-z0-9]/g, "");
}

export function isUsername(value: string) {
  return /^[a-z][a-z0-9]{2,29}$/.test(value);
}

export function usernameEmail(username: string) {
  return `${username}@dallasisd.org`;
}

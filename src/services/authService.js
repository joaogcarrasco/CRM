// src/services/authService.js
import { supabase } from "./supabaseClient";

// login com e-mail/senha
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error; // será tratado na tela
  return data; // { user, session }
}

// logout
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

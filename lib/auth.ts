"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createHash } from "crypto"
import { executeQuery } from "./db"
import { SignJWT, jwtVerify } from "jose"

// Chave secreta para JWT (em produção, use variáveis de ambiente)
const JWT_SECRET = new TextEncoder().encode("seu_segredo_super_secreto")

// Função para criar hash de senha
export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex")
}

// Função para login
export async function login(email: string, password: string, tipo: string) {
  const hashedPassword = hashPassword(password)

  try {
    const result = await executeQuery(
      "SELECT id, nome, email, tipo FROM usuarios WHERE email = ? AND senha = ? AND tipo = ?",
      [email, hashedPassword, tipo],
    )

    if (result.length === 0) {
      throw new Error("Credenciais inválidas")
    }

    const user = result[0]

    // Criar token JWT
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      nome: user.nome,
      tipo: user.tipo,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET)

    // Salvar token em cookie
    cookies().set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 horas
      path: "/",
    })

    return user
  } catch (error) {
    console.error("Erro no login:", error)
    throw new Error("Falha na autenticação")
  }
}

// Função para registro
export async function register(nome: string, email: string, senha: string, tipo: string) {
  const hashedPassword = hashPassword(senha)

  try {
    // Verificar se o email já existe
    const checkEmail = await executeQuery("SELECT id FROM usuarios WHERE email = ?", [email])

    if (checkEmail.length > 0) {
      throw new Error("Email já cadastrado")
    }

    // Inserir novo usuário
    await executeQuery("INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)", [
      nome,
      email,
      hashedPassword,
      tipo,
    ])

    return { success: true }
  } catch (error) {
    console.error("Erro no registro:", error)
    throw new Error("Falha ao registrar usuário")
  }
}

// Função para logout
export async function logout() {
  cookies().delete("auth_token")
  redirect("/login")
}

// Função para verificar autenticação
export async function getAuthUser() {
  const token = cookies().get("auth_token")?.value

  if (!token) {
    return null
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as {
      id: number
      email: string
      nome: string
      tipo: string
    }
  } catch (error) {
    console.error("Erro ao verificar token:", error)
    return null
  }
}

// Middleware para verificar autenticação
export async function requireAuth(tipo?: string) {
  const user = await getAuthUser()

  if (!user) {
    redirect("/login")
  }

  if (tipo && user.tipo !== tipo) {
    if (user.tipo === "admin") {
      redirect("/admin/dashboard")
    } else {
      redirect("/cliente/dashboard")
    }
  }

  return user
}

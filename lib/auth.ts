"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { executeQuery } from "./db"
import { SignJWT, jwtVerify } from "jose"
import { NextResponse } from "next/server"
import { RowDataPacket, OkPacket } from "mysql2"

// Chave secreta para JWT (em produção, use variáveis de ambiente)
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")

// Hash da senha
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

// Função para login
export async function login(usuario: string, password: string, tipo: string) {
  try {
    let user: any = null

    if (tipo === "admin") {
      // Para admin, busca na tabela usuarios
      const result = (await executeQuery(
        "SELECT id, nome, usuario, tipo, senha FROM usuarios WHERE usuario = ? AND tipo = ?",
        [usuario, tipo],
      )) as RowDataPacket[]

      if (result.length > 0) {
        const foundUser = result[0]
        const isValidPassword = await bcrypt.compare(password, foundUser.senha)
        if (isValidPassword) {
          user = foundUser
        }
      }
    } else if (tipo === "cliente") {
      // Para cliente, busca na tabela clientes
      const result = (await executeQuery(
        "SELECT id, nome, usuario, senha, 'cliente' as tipo FROM clientes WHERE usuario = ?",
        [usuario],
      )) as RowDataPacket[]

      if (result.length > 0) {
        const foundUser = result[0]
        const isValidPassword = await bcrypt.compare(password, foundUser.senha)
        if (isValidPassword) {
          user = foundUser
        }
      }
    }

    if (!user) {
      throw new Error("Credenciais inválidas")
    }

    // Criar token JWT
    const token = await new SignJWT({
      id: user.id,
      usuario: user.usuario,
      nome: user.nome,
      tipo: user.tipo,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET)

    // Salvar token em cookie
    const cookieStore = await cookies()
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 horas
      path: "/",
    })

    return user
  } catch (error) {
    console.error("Erro no login:", error)
    throw new Error(error instanceof Error ? `Falha na autenticação: ${error.message}` : "Falha na autenticação")
  }
}

// Função para login automático (tenta admin primeiro, depois cliente)
export async function loginAuto(usuario: string, password: string) {
  try {
    let user: any = null

    // Primeiro tenta como admin
    const adminResult = (await executeQuery(
      "SELECT id, nome, usuario, tipo, senha FROM usuarios WHERE usuario = ? AND tipo = 'admin'",
      [usuario],
    )) as RowDataPacket[]

    if (adminResult.length > 0) {
      const adminUser = adminResult[0]
      const isValidPassword = await bcrypt.compare(password, adminUser.senha)
      if (isValidPassword) {
        user = adminUser
      }
    }

    if (!user) {
      // Se não for admin, tenta como cliente
      const clienteResult = (await executeQuery(
        "SELECT id, nome, usuario, senha, 'cliente' as tipo FROM clientes WHERE usuario = ?",
        [usuario],
      )) as RowDataPacket[]

      if (clienteResult.length > 0) {
        const clienteUser = clienteResult[0]
        const isValidPassword = await bcrypt.compare(password, clienteUser.senha)
        if (isValidPassword) {
          user = clienteUser
        }
      }
    }

    if (!user) {
      throw new Error("Credenciais inválidas")
    }

    // Criar token JWT
    const token = await new SignJWT({
      id: user.id,
      usuario: user.usuario,
      nome: user.nome,
      tipo: user.tipo,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET)

    // Salvar token em cookie
    const cookieStore = await cookies()
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 horas
      path: "/",
    })

    return user
  } catch (error) {
    console.error("Erro no login automático:", error)
    throw new Error(error instanceof Error ? `Falha na autenticação: ${error.message}` : "Falha na autenticação")
  }
}

// Função para registro
export async function register(nome: string, usuario: string, email: string, senha: string, tipo: string) {
  const hashedPassword = await hashPassword(senha)

  try {
    // Verificar se o usuário já existe
    const checkUsuario = (await executeQuery("SELECT id FROM usuarios WHERE usuario = ?", [usuario])) as RowDataPacket[]

    if (checkUsuario.length > 0) {
      throw new Error("Usuário já cadastrado")
    }

    // Verificar se o email já existe
    const checkEmail = (await executeQuery("SELECT id FROM usuarios WHERE email = ?", [email])) as RowDataPacket[]

    if (checkEmail.length > 0) {
      throw new Error("Email já cadastrado")
    }

    // Inserir novo usuário
    await executeQuery("INSERT INTO usuarios (nome, usuario, email, senha, tipo) VALUES (?, ?, ?, ?, ?)", [
      nome,
      usuario,
      email,
      hashedPassword,
      tipo,
    ])

    return { success: true }
  } catch (error) {
    console.error("Erro no registro:", error)
    throw new Error(error instanceof Error ? `Falha ao registrar usuário: ${error.message}` : "Falha ao registrar usuário")
  }
}

// Função para logout
export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("auth_token")
  redirect("/")
}

// Função para verificar autenticação
export async function getAuthUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value

  if (!token) {
    return null
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as {
      id: number
      nome: string
      usuario: string
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
    redirect("/")
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

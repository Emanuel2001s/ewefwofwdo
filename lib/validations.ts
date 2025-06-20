import * as z from "zod"

// Schema para validação de username
export const usernameSchema = z
  .string()
  .min(3, "Usuário deve ter pelo menos 3 caracteres")
  .max(20, "Usuário deve ter no máximo 20 caracteres")
  .regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e underscore são permitidos")

// Schema para validação de senha
export const passwordSchema = z
  .string()
  .min(6, "Senha deve ter pelo menos 6 caracteres")
  .max(50, "Senha deve ter no máximo 50 caracteres")

// Schema para validação de email
export const emailSchema = z
  .string()
  .email("Email inválido")

// Schema para validação de nome
export const nomeSchema = z
  .string()
  .min(2, "Nome deve ter pelo menos 2 caracteres")
  .max(100, "Nome deve ter no máximo 100 caracteres")

// Schema para login com usuário
export const loginSchema = z.object({
  usuario: usernameSchema,
  senha: passwordSchema,
})

// Schema para registro de usuário
export const registerSchema = z.object({
  nome: nomeSchema,
  usuario: usernameSchema,
  email: emailSchema,
  senha: passwordSchema,
  confirmarSenha: passwordSchema,
  tipo: z.enum(["admin", "cliente"]),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "Senhas não coincidem",
  path: ["confirmarSenha"],
})

// Schema para cliente com credenciais
export const clienteComCredenciaisSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  plano_id: z.number().int().positive("Plano é obrigatório"),
  servidor_id: z.number().int().positive("Servidor é obrigatório"),
  data_ativacao: z.string(),
  observacoes: z.string().optional(),
  // Campos de credenciais do cliente
  usuarioCliente: usernameSchema,
  senhaCliente: passwordSchema,
  confirmarSenhaCliente: passwordSchema,
}).refine((data) => data.senhaCliente === data.confirmarSenhaCliente, {
  message: "Senhas não coincidem",
  path: ["confirmarSenhaCliente"],
})

// Tipos TypeScript derivados dos schemas
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ClienteComCredenciaisFormData = z.infer<typeof clienteComCredenciaisSchema> 
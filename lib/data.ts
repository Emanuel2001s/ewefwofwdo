import { RowDataPacket } from "mysql2";
import { executeQuery } from "./db";

export async function getPlano(id: number): Promise<{ id: number; nome: string; valor: number; duracao_dias: number } | null> {
  const result = (await executeQuery("SELECT id, nome, valor, duracao_dias FROM planos WHERE id = ?", [id])) as RowDataPacket[];
  return result.length > 0 ? (result[0] as { id: number; nome: string; valor: number; duracao_dias: number }) : null;
}

export async function getCliente(id: number): Promise<any | null> {
  const query = `
    SELECT
      c.id, c.nome, c.whatsapp, c.data_vencimento, c.data_ativacao,
      c.plano_id, p.nome as plano_nome, p.duracao_dias as plano_duracao_dias,
      c.servidor_id, s.nome as servidor_nome,
      c.observacoes, c.dispositivos, c.status,
      c.usuario, c.senha
    FROM clientes c
    LEFT JOIN planos p ON c.plano_id = p.id
    LEFT JOIN servidores s ON c.servidor_id = s.id
    WHERE c.id = ?
  `;
  const result = (await executeQuery(query, [id])) as RowDataPacket[];
  return result.length > 0 ? result[0] : null;
}

export async function getPlanos(): Promise<{ id: number; nome: string; valor: number; duracao_dias: number }[]> {
  const result = (await executeQuery("SELECT id, nome, valor, duracao_dias FROM planos ORDER BY nome ASC")) as RowDataPacket[];
  return result as { id: number; nome: string; valor: number; duracao_dias: number }[];
}

export async function getServidores(): Promise<{ id: number; nome: string }[]> {
  const result = (await executeQuery("SELECT id, nome FROM servidores ORDER BY nome ASC")) as RowDataPacket[];
  return result as { id: number; nome: string }[];
}

// Adicione outras funções de busca de dados aqui conforme necessário 
import { notFound } from "next/navigation";
import { ClienteForm } from "@/components/cliente-form";
import { executeQuery } from "@/lib/db";

async function getServidores() {
  const result = await executeQuery("SELECT id, nome FROM servidores ORDER BY nome ASC");
  return result as { id: number; nome: string }[];
}

async function getPlanos() {
  const result = await executeQuery("SELECT id, nome, valor, duracao_dias FROM planos ORDER BY nome ASC");
  return result as { id: number; nome: string; valor: number; duracao_dias: number }[];
}

async function getCliente(id: string) {
  const cliente = await executeQuery(
    `
    SELECT c.*,
           p.nome as plano_nome, p.valor as plano_valor, p.duracao_dias,
           s.nome as servidor_nome
    FROM clientes c
    JOIN planos p ON c.plano_id = p.id
    JOIN servidores s ON c.servidor_id = s.id
    WHERE c.id = ?
  `,
    [id],
  );

  if (Array.isArray(cliente) && cliente.length > 0) {
    return cliente[0];
  }
  return null;
}

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const servidores = await getServidores();
  const planos = await getPlanos();
  const cliente = await getCliente(id);

  if (!cliente) {
    notFound();
  }

  console.log("Dados do cliente fetched para edição:", cliente);

  // Prepara os dados do cliente para o formulário
  const initialData = {
    id: cliente.id,
    nome: cliente.nome,
    whatsapp: cliente.whatsapp,
    data_vencimento: new Date(cliente.data_vencimento),
    data_ativacao: cliente.data_ativacao ? new Date(cliente.data_ativacao) : new Date(),
    plano_id: cliente.plano_id,
    servidor_id: cliente.servidor_id,
    status: cliente.status,
    observacoes: cliente.observacoes || "",
    dispositivos: cliente.dispositivos || "",
    usuario: cliente.usuario || "",
    senha: "", // Nunca pré-preencher senha por segurança
  };

  return (
    <ClienteForm key={cliente.id} servidores={servidores} planos={planos} initialData={initialData} />
  );
} 
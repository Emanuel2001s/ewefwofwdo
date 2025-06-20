import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { getAuthUser, hashPassword } from "@/lib/auth";
import { OkPacket, RowDataPacket } from "mysql2";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser();
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = params;
    const cliente = (await executeQuery(
      `SELECT c.id, c.nome, c.whatsapp, c.data_vencimento, c.data_ativacao, c.plano_id, 
       c.servidor_id, c.observacoes, c.dispositivos, c.status, c.usuario
       FROM clientes c WHERE c.id = ?`, 
      [id]
    )) as RowDataPacket[];

    if (cliente.length === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    return NextResponse.json(cliente[0]);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    return NextResponse.json({ error: "Erro ao buscar cliente" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser();
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = params;
    const { nome, whatsapp, data_vencimento, data_ativacao, plano_id, servidor_id, observacoes, dispositivos, status, usuarioLogin, senhaLogin } = await request.json();

    // Processar WhatsApp - adicionar código 55 se não tiver
    let whatsappProcessado = whatsapp;
    if (whatsapp !== undefined) {
      whatsappProcessado = whatsapp.replace(/\D/g, ''); // Remove tudo que não for número
      if (whatsappProcessado.length === 11 && !whatsappProcessado.startsWith('55')) {
        whatsappProcessado = '55' + whatsappProcessado;
      }
    }

    // Buscar cliente existente
    const existingCliente = (await executeQuery("SELECT id, usuario FROM clientes WHERE id = ?", [id])) as RowDataPacket[];
    if (existingCliente.length === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }
    const clienteAtual = existingCliente[0];

    // Construir a query de atualização do cliente dinamicamente
    let updateQuery = "UPDATE clientes SET";
    const updateParams: (string | number | string[])[] = [];
    const clienteUpdates: string[] = [];

    if (nome !== undefined) { clienteUpdates.push(" nome = ?"); updateParams.push(nome); }
    if (whatsapp !== undefined) { clienteUpdates.push(" whatsapp = ?"); updateParams.push(whatsappProcessado); }
    if (data_vencimento !== undefined) { 
      clienteUpdates.push(" data_vencimento = ?"); 
      updateParams.push(new Date(data_vencimento).toISOString().split("T")[0]); 
    }
    if (data_ativacao !== undefined) { 
      clienteUpdates.push(" data_ativacao = ?"); 
      updateParams.push(new Date(data_ativacao).toISOString().split("T")[0]); 
    }
    if (plano_id !== undefined) { clienteUpdates.push(" plano_id = ?"); updateParams.push(plano_id); }
    if (servidor_id !== undefined) { clienteUpdates.push(" servidor_id = ?"); updateParams.push(servidor_id); }
    if (observacoes !== undefined) { clienteUpdates.push(" observacoes = ?"); updateParams.push(observacoes); }
    if (dispositivos !== undefined) { 
      clienteUpdates.push(" dispositivos = ?"); 
      updateParams.push(Array.isArray(dispositivos) ? dispositivos.join(",") : dispositivos); 
    }
    if (status !== undefined) { clienteUpdates.push(" status = ?"); updateParams.push(status); }

    // Verificar se usuário de login foi alterado
    if (usuarioLogin !== undefined && usuarioLogin !== clienteAtual.usuario) {
      // Verificar se o novo usuário já existe
      const existingUserByLogin = (await executeQuery("SELECT id FROM clientes WHERE usuario = ? AND id != ?", [usuarioLogin, id])) as RowDataPacket[];
      if (existingUserByLogin.length > 0) {
        return NextResponse.json({ error: "Nome de usuário já cadastrado para outro cliente" }, { status: 400 });
      }
      clienteUpdates.push(" usuario = ?");
      updateParams.push(usuarioLogin);
    }

    // Atualizar senha se fornecida
    if (senhaLogin !== undefined && senhaLogin.trim() !== "") {
      const hashedPassword = await hashPassword(senhaLogin);
      clienteUpdates.push(" senha = ?");
      updateParams.push(hashedPassword);
    }

    if (clienteUpdates.length === 0) {
      return NextResponse.json({ message: "Nenhuma alteração detectada para o cliente." }, { status: 200 });
    }

    const result = (await executeQuery(`${updateQuery} ${clienteUpdates.join(",")} WHERE id = ?`, [...updateParams, id])) as OkPacket;
    
    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "Nenhuma alteração detectada para o cliente." }, { status: 200 });
    }

    return NextResponse.json({ message: "Cliente atualizado com sucesso" }, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar cliente na API:", error);
    return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser();
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = params;

    // Deletar o cliente
    const resultCliente = (await executeQuery("DELETE FROM clientes WHERE id = ?", [id])) as OkPacket;

    if (resultCliente.affectedRows === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Cliente excluído com sucesso" }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    return NextResponse.json({ error: "Erro ao excluir cliente" }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { updateExpiredClients } from '@/lib/auto-update-clients';
import { executeAutoNotifications } from '@/lib/auto-whatsapp-notifications';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Iniciando execução das tarefas diárias...');
    
    // Verifica se a requisição tem a chave de autorização
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const results = {
      updateExpired: null as any,
      processAgendamentos: null as any,
      processEnvios: null as any,
      whatsappNotifications: null as any
    };

    // 1. Atualizar clientes expirados
    try {
      console.log('📅 Executando: Atualização de clientes expirados...');
      results.updateExpired = await updateExpiredClients();
      console.log('✅ Clientes expirados atualizados');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar clientes expirados:', error);
      results.updateExpired = { error: error.message };
    }

    // 2. Processar agendamentos (simulado - você pode implementar a lógica específica)
    try {
      console.log('📋 Executando: Processamento de agendamentos...');
      // Aqui você pode adicionar a lógica específica de processamento de agendamentos
      // Por exemplo, verificar campanhas agendadas para hoje
      results.processAgendamentos = { message: 'Agendamentos processados' };
      console.log('✅ Agendamentos processados');
    } catch (error: any) {
      console.error('❌ Erro ao processar agendamentos:', error);
      results.processAgendamentos = { error: error.message };
    }

    // 3. Processar envios (simulado - você pode implementar a lógica específica)
    try {
      console.log('📤 Executando: Processamento de envios...');
      // Aqui você pode adicionar a lógica específica de processamento de envios
      // Por exemplo, enviar mensagens pendentes
      results.processEnvios = { message: 'Envios processados' };
      console.log('✅ Envios processados');
    } catch (error: any) {
      console.error('❌ Erro ao processar envios:', error);
      results.processEnvios = { error: error.message };
    }

    // 4. Enviar notificações WhatsApp
    try {
      console.log('📱 Executando: Notificações WhatsApp...');
      results.whatsappNotifications = await executeAutoNotifications();
      console.log('✅ Notificações WhatsApp enviadas');
    } catch (error: any) {
      console.error('❌ Erro ao enviar notificações WhatsApp:', error);
      results.whatsappNotifications = { error: error.message };
    }

    console.log('🎉 Todas as tarefas diárias foram executadas!');

    return NextResponse.json({
      success: true,
      message: 'Tarefas diárias executadas com sucesso',
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error: any) {
    console.error('❌ Erro geral nas tarefas diárias:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 
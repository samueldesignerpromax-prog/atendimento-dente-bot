const { v4: uuidv4 } = require('uuid');

// Procedimentos disponíveis
const PROCEDIMENTOS = [
  { id: 'limpeza', nome: 'Limpeza', preco: 120 },
  { id: 'clareamento', nome: 'Clareamento', preco: 800 },
  { id: 'extracao', nome: 'Extração', preco: 300 },
  { id: 'ortodontia', nome: 'Ortodontia (avaliação)', preco: 100 }
];

// Formas de pagamento
const PAGAMENTOS = [
  { id: 'pix', nome: 'PIX', desconto: 10 },
  { id: 'cartao', nome: 'Cartão de crédito', desconto: 0 },
  { id: 'dinheiro', nome: 'Dinheiro', desconto: 0 }
];

// Gerar próximos dias disponíveis
function getProximosDias() {
  const dias = [];
  const hoje = new Date();
  
  for (let i = 0; i <= 7; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    const diaSemana = data.getDay();
    
    if (diaSemana !== 0) {
      dias.push({
        value: data.toLocaleDateString('pt-BR'),
        text: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : data.toLocaleDateString('pt-BR'),
        diaSemana: diaSemana
      });
    }
  }
  
  return dias.slice(0, 6);
}

// Verificar horários disponíveis
function getHorariosDisponiveis(dataStr) {
  const data = new Date(dataStr.split('/').reverse().join('-'));
  const diaSemana = data.getDay();
  
  if (diaSemana === 6) {
    return ['09:00', '10:00', '11:00'];
  }
  
  return ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
}

const sessions = new Map();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { action, value, sessionId } = req.body;
    
    let session = sessions.get(sessionId);
    if (!session) {
      session = { step: 'inicio', data: {} };
      sessions.set(sessionId, session);
    }
    
    let response = { message: '', buttons: [], nextStep: session.step };
    
    console.log('Step atual:', session.step, 'Action:', action, 'Value:', value);
    
    switch(session.step) {
      case 'inicio':
        if (action === 'start' || action === 'Agendar consulta') {
          response.message = "Qual é o seu nome?";
          response.buttons = [];
          response.nextStep = 'nome';
        } else {
          response.message = "Olá! 👋 Bem-vindo à clínica odontológica Sorriso Perfeito!\n\nDeseja agendar uma consulta?";
          response.buttons = [{ text: "✅ Agendar consulta", value: "start" }];
          response.nextStep = 'inicio';
        }
        break;
        
      case 'nome':
        if (value && value.trim().length >= 2) {
          session.data.nome = value.trim();
          response.message = `Prazer em conhecê-lo, ${session.data.nome}! 🦷\n\nQual procedimento você gostaria de realizar?`;
          response.buttons = PROCEDIMENTOS.map(p => ({
            text: `${p.nome} - R$ ${p.preco}`,
            value: p.id
          }));
          response.nextStep = 'procedimento';
        } else if (action === 'nome') {
          response.message = "Qual é o seu nome?";
          response.buttons = [];
          response.nextStep = 'nome';
        }
        break;
        
      case 'procedimento':
        const procedimento = PROCEDIMENTOS.find(p => p.id === value);
        if (procedimento) {
          session.data.procedimento = procedimento;
          
          const dias = getProximosDias();
          response.message = `Ótima escolha! ${procedimento.nome} - R$ ${procedimento.preco}\n\nQual data você prefere?`;
          response.buttons = dias.map(d => ({
            text: d.text,
            value: d.value
          }));
          response.buttons.push({ text: "📅 Escolher outra data", value: "outra_data" });
          response.nextStep = 'data';
        }
        break;
        
      case 'data':
        let dataSelecionada = value;
        
        if (value === 'outra_data') {
          const dias = getProximosDias();
          response.message = "Escolha outra data:";
          response.buttons = dias.map(d => ({
            text: d.text,
            value: d.value
          }));
          response.nextStep = 'data';
          break;
        }
        
        if (dataSelecionada) {
          session.data.data = dataSelecionada;
          const horarios = getHorariosDisponiveis(dataSelecionada);
          
          response.message = `Data escolhida: ${dataSelecionada}\n\nQual horário você prefere?`;
          response.buttons = horarios.map(h => ({
            text: h,
            value: h
          }));
          response.nextStep = 'horario';
        }
        break;
        
      case 'horario':
        if (value) {
          session.data.horario = value;
          response.message = `Horário escolhido: ${value}\n\n💰 Forma de pagamento:`;
          response.buttons = PAGAMENTOS.map(p => {
            let text = p.nome;
            if (p.desconto > 0) {
              const precoComDesconto = session.data.procedimento.preco * (1 - p.desconto / 100);
              text += ` (${p.desconto}% desconto - R$ ${precoComDesconto.toFixed(2)})`;
            } else {
              text += ` - R$ ${session.data.procedimento.preco.toFixed(2)}`;
            }
            return { text, value: p.id };
          });
          response.nextStep = 'pagamento';
        }
        break;
        
      case 'pagamento':
        const pagamento = PAGAMENTOS.find(p => p.id === value);
        if (pagamento) {
          session.data.pagamento = pagamento;
          
          let valorFinal = session.data.procedimento.preco;
          let desconto = 0;
          if (pagamento.desconto > 0) {
            desconto = (session.data.procedimento.preco * pagamento.desconto) / 100;
            valorFinal = session.data.procedimento.preco - desconto;
          }
          session.data.valorFinal = valorFinal;
          session.data.desconto = desconto;
          
          response.message = `📋 **CONFIRME SEUS DADOS:**\n\n` +
            `👤 Nome: ${session.data.nome}\n` +
            `🦷 Procedimento: ${session.data.procedimento.nome}\n` +
            `💰 Valor: R$ ${session.data.procedimento.preco.toFixed(2)}\n` +
            (desconto > 0 ? `🎉 Desconto: -R$ ${desconto.toFixed(2)}\n💵 Valor final: R$ ${valorFinal.toFixed(2)}\n` : '') +
            `📅 Data: ${session.data.data}\n` +
            `⏰ Horário: ${session.data.horario}\n` +
            `💳 Pagamento: ${pagamento.nome}\n\n` +
            `Tudo certo?`;
          
          response.buttons = [
            { text: "✅ Confirmar agendamento", value: "confirmar" },
            { text: "❌ Cancelar", value: "cancelar" }
          ];
          response.nextStep = 'confirmacao';
        }
        break;
        
      case 'confirmacao':
        if (value === 'confirmar') {
          const appointment = {
            id: uuidv4(),
            nome: session.data.nome,
            procedimento: session.data.procedimento.nome,
            valorOriginal: session.data.procedimento.preco,
            desconto: session.data.desconto,
            valorFinal: session.data.valorFinal,
            data: session.data.data,
            horario: session.data.horario,
            pagamento: session.data.pagamento.nome,
            createdAt: new Date().toISOString()
          };
          
          response.message = `✅ **AGENDAMENTO CONFIRMADO!**\n\n` +
            `👤 Nome: ${appointment.nome}\n` +
            `🦷 Procedimento: ${appointment.procedimento}\n` +
            `💰 Valor: R$ ${appointment.valorFinal.toFixed(2)}\n` +
            `📅 Data: ${appointment.data}\n` +
            `⏰ Horário: ${appointment.horario}\n` +
            `💳 Pagamento: ${appointment.pagamento}\n\n` +
            `📌 Entraremos em contato caso necessário.\n\n` +
            `**Obrigado por escolher a clínica Sorriso Perfeito! 🦷✨**\n\n` +
            `Deseja fazer um novo agendamento?`;
          
          response.buttons = [
            { text: "🔄 Novo agendamento", value: "novo" }
          ];
          response.nextStep = 'finalizado';
          
          console.log('Agendamento salvo:', appointment);
        } else {
          response.message = "❌ Agendamento cancelado.\n\nDeseja começar um novo?";
          response.buttons = [
            { text: "🔄 Recomeçar", value: "novo" }
          ];
          response.nextStep = 'cancelado';
        }
        break;
        
      case 'finalizado':
      case 'cancelado':
        if (value === 'novo') {
          sessions.delete(sessionId);
          response.message = "Olá! 👋 Bem-vindo à clínica odontológica Sorriso Perfeito!\n\nDeseja agendar uma consulta?";
          response.buttons = [{ text: "✅ Agendar consulta", value: "start" }];
          response.nextStep = 'inicio';
        }
        break;
    }
    
    if (response.nextStep !== session.step) {
      session.step = response.nextStep;
      sessions.set(sessionId, session);
    }
    
    res.status(200).json({
      success: true,
      message: response.message,
      buttons: response.buttons
    });
    
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Armazenar agendamentos em memória
let appointments = [];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    res.status(200).json(appointments);
  } else if (req.method === 'POST') {
    const newAppointment = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    appointments.push(newAppointment);
    res.status(200).json({ success: true, appointment: newAppointment });
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
};

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const pagamentos = {};

app.post('/gerar-pix', async (req, res) => {
    try {
        console.log('🔄 Criando QR Code PIX via Mercado Pago...');

        const response = await axios.post(
            'https://api.mercadopago.com/v1/payments',
            {
                transaction_amount: 5,
                description: 'Conversão MP3 para WAV',
                payment_method_id: 'pix',
                payer: {
                    email: 'cliente@email.com'
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const { id, qr_code_base64, status } = response.data;

        pagamentos[id] = {
            pago: false,
            arquivo: req.body.arquivo,
            status: status
        };

        console.log('✅ QR Code gerado com sucesso!');
        res.json({ transacaoId: id, qrCode: qr_code_base64 });
    } catch (err) {
        console.error('❌ Erro ao gerar QR Code:', err.response?.data || err.message);
        res.status(500).json({ erro: 'Erro ao gerar QR Code Pix' });
    }
});

app.get('/status-pix/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(
            `https://api.mercadopago.com/v1/payments/${id}`,
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`
                }
            }
        );

        const { status } = response.data;
        pagamentos[id].pago = status === 'approved';
        pagamentos[id].status = status;

        console.log(`🔍 Status da transação ${id}: ${status}`);
        res.json({ pago: pagamentos[id].pago, status });
    } catch (err) {
        console.error('❌ Erro ao consultar status:', err.message);
        res.json({ pago: false, status: 'ERROR' });
    }
});

app.listen(3000, () => console.log('🚀 Servidor Mercado Pago rodando na porta 3000'));

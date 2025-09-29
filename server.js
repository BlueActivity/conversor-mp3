const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const ABACATE_TOKEN = 'abc_dev_ue6DKpRTPe2LU0MAcK1Lt1p6';
const pagamentos = {};

app.post('/api/pix', async (req, res) => {
    try {
        console.log('🔄 Criando QR Code PIX...');
        
        const response = await axios.post(
            'https://api.abacatepay.com/v1/pixQrCode/create',  // ← .COM
            {
                amount: 500, // R$ 5,00 em centavos
                expiresIn: 3600, // 1 hora de expiração
                description: 'Conversão MP3 para WAV',
                metadata: {
                    externalId: 'conv_' + Date.now()
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${ABACATE_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('✅ QR Code PIX criado!');
        
        const { id, brCodeBase64, amount, status } = response.data.data;
        
        pagamentos[id] = { 
            pago: false, 
            arquivo: req.body.arquivo,
            status: status
        };
        
        res.json({ 
            id, 
            qrCode: brCodeBase64,
            amount: amount
        });
        
    } catch (err) {
        console.error('❌ Erro ao criar QR Code:', err.response?.data || err.message);
        
        // Fallback
        const qrCodeTeste = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PIX-TESTE-VIBE-CODER';
        res.json({ 
            id: 'teste_' + Date.now(),
            qrCode: qrCodeTeste
        });
    }
});

// CONSULTA DE STATUS CORRIGIDA - .COM
app.get('/api/pix/status/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(
            `https://api.abacatepay.com/v1/pixQrCode/get?id=${id}`,  // ← .COM
            {
                headers: {
                    Authorization: `Bearer ${ABACATE_TOKEN}`,
                },
            }
        );

        console.log('✅ Status consultado:', response.data);
        const { status } = response.data.data;
        pagamentos[id].pago = status === 'PAID';
        pagamentos[id].status = status;
        
        res.json({ pago: pagamentos[id].pago, status: status });
        
    } catch (err) {
        console.error('❌ Erro ao consultar status:', err.message);
        res.json({ pago: false, status: 'ERROR' });
    }
});

app.listen(3001, () => console.log('🚀 Servidor rodando na porta 3001'));
// Elementos do DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const convertBtn = document.getElementById('convertBtn');
const loading = document.getElementById('loading');
const audioPreview = document.getElementById('audioPreview');
const previewAudio = document.getElementById('previewAudio');
const downloadBtn = document.getElementById('downloadBtn');
const errorMessage = document.getElementById('errorMessage');
const pagamentoArea = document.getElementById('pagamentoArea');
const qrCodeImg = document.getElementById('qrCodeImg');
const aguardandoPagamento = document.getElementById('aguardandoPagamento');

let selectedFile = null;
let audioContext = null;
let wavUrl = null;
let pollingInterval = null;

// Drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
});
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, highlight, false);
});
['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, unhighlight, false);
});
function highlight() {
    uploadArea.classList.add('highlight');
}
function unhighlight() {
    uploadArea.classList.remove('highlight');
}
uploadArea.addEventListener('drop', handleDrop, false);
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) handleFiles(files);
}
uploadArea.querySelector('.browse-btn').addEventListener('click', () => {
    fileInput.click();
});
fileInput.addEventListener('change', function() {
    if (this.files.length) handleFiles(this.files);
});
function handleFiles(files) {
    const file = files[0];
    if (file.type !== 'audio/mpeg' && !file.name.toLowerCase().endsWith('.mp3')) {
        showError('Por favor, selecione um arquivo MP3 válido.');
        return;
    }
    if (file.size > 20 * 1024 * 1024) {
        showError('O arquivo é muito grande. Por favor, selecione um arquivo menor que 20MB.');
        return;
    }
    selectedFile = file;
    fileInfo.textContent = `Arquivo selecionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    convertBtn.disabled = false;
    audioPreview.style.display = 'none';
    hideError();
}
convertBtn.addEventListener('click', convertMp3ToWav);
async function convertMp3ToWav() {
    if (!selectedFile) {
        showError('Por favor, selecione um arquivo MP3 primeiro.');
        return;
    }
    loading.style.display = 'block';
    convertBtn.disabled = true;
    audioPreview.style.display = 'none';
    hideError();
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await readFileAsArrayBuffer(selectedFile);
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const wavBlob = audioBufferToWav(audioBuffer);
        if (wavUrl) URL.revokeObjectURL(wavUrl);
        wavUrl = URL.createObjectURL(wavBlob);
        previewAudio.src = wavUrl;
        downloadBtn.href = wavUrl;
        downloadBtn.download = selectedFile.name.replace('.mp3', '.wav') || 'converted.wav';
        loading.style.display = 'none';
        audioPreview.style.display = 'block';
        convertBtn.disabled = false;
    } catch (error) {
        console.error('Erro na conversão:', error);
        showError('Erro ao converter o MP3. Por favor, tente novamente com um arquivo válido.');
        loading.style.display = 'none';
        convertBtn.disabled = false;
    }
}
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}
function audioBufferToWav(buffer) {
    const numOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numOfChannels * 2 + 44;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channelData = [];
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * numOfChannels * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChannels * 2, true);
    view.setUint16(32, numOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, buffer.length * numOfChannels * 2, true);
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numOfChannels; channel++) {
            if (!channelData[channel]) {
                channelData[channel] = buffer.getChannelData(channel);
            }
            const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}
function hideError() {
    errorMessage.style.display = 'none';
}

// Pagamento Pix com Abacate Pay
downloadBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    if (!downloadBtn.href || downloadBtn.href === '#') {
        showError('Por favor, converta um arquivo antes de baixar.');
        return;
    }
    // Solicita QR Code Pix dinâmico ao backend
    try {
        pagamentoArea.style.display = 'block';
        aguardandoPagamento.textContent = 'Aguardando pagamento...';
        qrCodeImg.src = '';
        audioPreview.style.display = 'none';
        // Chame seu backend (ajuste a URL se necessário)
        const res = await fetch('http://localhost:3000/api/pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ arquivo: downloadBtn.download })
        });
        const { id, qrCode } = await res.json();
        qrCodeImg.src = `data:image/png;base64,${qrCode}`;

        // Polling para checar pagamento
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(async () => {
            const statusRes = await fetch(`http://localhost:3000/api/pix/status/${id}`);
            const { pago } = await statusRes.json();
            if (pago) {
                clearInterval(pollingInterval);
                aguardandoPagamento.textContent = 'Pagamento confirmado! Baixando arquivo...';
                // Libera o download automaticamente
                setTimeout(() => {
                    const a = document.createElement('a');
                    a.href = downloadBtn.href;
                    a.download = downloadBtn.download;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    pagamentoArea.style.display = 'none';
                    audioPreview.style.display = 'block';
                    aguardandoPagamento.textContent = 'Aguardando pagamento...';
                }, 1000);
            }
        }, 3000);
    } catch (err) {
        showError('Erro ao gerar cobrança Pix. Tente novamente.');
        pagamentoArea.style.display = 'none';
        audioPreview.style.display = 'block';
    }
});

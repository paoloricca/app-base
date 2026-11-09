const fs = require('fs');

async function identifyFile(file, maxFileSize) {
    if (!file.size || file.size > maxFileSize) throw new Error('Dimensione allegato non valida.');
    const handle = await fs.promises.open(file.filepath, 'r');
    const bytes = Buffer.alloc(16);
    try { await handle.read(bytes, 0, bytes.length, 0); } finally { await handle.close(); }
    if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))) return 'image/gif';
    if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
    if (bytes.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
    throw new Error('Formato non supportato: usare immagini PNG, JPEG, GIF, WebP o PDF.');
}

module.exports = { identifyFile };

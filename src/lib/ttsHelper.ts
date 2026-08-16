let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

// Hàm lọc sạch ký tự đặc biệt, Markdown, Emoji, dấu câu thừa
export function cleanTextForTTS(van_ban: string): string {
  if (!van_ban) return '';
  let text = van_ban;

  // Xóa chấm/phẩy trong con số (1.000.000 -> 1000000)
  text = text.replace(/(\d+)\.(\d+)/g, '$1$2');
  while (/(\d+)\.(\d+)/.test(text)) {
    text = text.replace(/(\d+)\.(\d+)/g, '$1$2');
  }
  text = text.replace(/(\d+),(\d+)/g, '$1$2');

  // Bỏ Markdown & Ký tự đặc biệt
  text = text.replace(/[\*\#\_\~\`\>]/g, '');
  text = text.replace(/[@$%^&*()_+=\[\]{};:'"\\|<>\/]/g, ' ');

  // Bỏ Emoji & Mặt cười
  text = text.replace(/[:=;>]['-]?[()DdPpSS0oO/\\|]{1,}/g, '');
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '');

  // Chuẩn hóa dấu câu
  text = text.replace(/[.!?]{2,}/g, '.');
  text = text.replace(/[,;]{2,}/g, ',');
  text = text.replace(/\s+/g, ' ');

  return text.trim();
}

// Tách đoạn văn thành từng câu ngắn (<120 ký tự) để gTTS đọc không bị ngắt
export function splitTextIntoSentences(text: string): string[] {
  const cleanText = cleanTextForTTS(text);
  const rawSentences = cleanText.match(/[^.!?\n]+[.!?\n]+/g) || [cleanText];
  let chunks: string[] = [];

  for (let sentence of rawSentences) {
    let clean = sentence.trim();
    if (!clean) continue;
    if (clean.length > 120) {
      let parts = clean.split(/[,;]/);
      chunks.push(...parts.filter(p => p.trim().length > 0));
    } else {
      chunks.push(clean);
    }
  }

  return chunks.length > 0 ? chunks : [cleanText];
}

// Dừng âm thanh đang phát
export function stopTTS() {
  if (currentSource) {
    try { currentSource.stop(); } catch (e) {}
    currentSource = null;
  }
}

// Tải trước và phát hàng đợi Audio qua gTTS Proxy
export async function playGTTSQueue(text: string, onFinished?: () => void) {
  stopTTS();
  
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  const sentences = splitTextIntoSentences(text);
  if (!sentences.length) {
    onFinished?.();
    return;
  }

  let nextAudioPromise = fetchAndDecodeAudio(sentences[0]);

  for (let i = 0; i < sentences.length; i++) {
    try {
      const audioBuffer = await nextAudioPromise;

      if (i + 1 < sentences.length) {
        nextAudioPromise = fetchAndDecodeAudio(sentences[i + 1]);
      }

      if (audioBuffer) {
        await playBuffer(audioBuffer);
      }
    } catch (err) {
      console.error('Lỗi phát audio gTTS:', err);
    }
  }

  onFinished?.();
}

async function fetchAndDecodeAudio(text: string): Promise<AudioBuffer | null> {
  try {
    const cleanText = encodeURIComponent(text);
    const response = await fetch(`/api/tts?text=${cleanText}`);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx!.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.error('Fetch Audio Error:', e);
    return null;
  }
}

function playBuffer(buffer: AudioBuffer): Promise<void> {
  return new Promise((resolve) => {
    currentSource = audioCtx!.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.connect(audioCtx!.destination);
    currentSource.onended = () => resolve();
    currentSource.start(0);
  });
}

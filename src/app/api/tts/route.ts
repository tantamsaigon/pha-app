import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text');

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  // API gTTS chuẩn tiếng Việt (vi-VN)
  const gttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=vi&client=tw-ob`;

  try {
    const response = await fetch(gttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'TTS Fetch Failed' }, { status: 500 });
  }
}

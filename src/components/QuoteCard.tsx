import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { RefreshCw, Share2, Download, Code, Twitter, Facebook, Copy, Instagram, Settings } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function QuoteCard() {
  const [quote, setQuote] = useState<any>(null);
  const [bgImage, setBgImage] = useState<string>('');
  const [logo, setLogo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const fetchQuoteAndBg = async (isRefresh = false) => {
    setLoading(true);
    try {
      const quoteRes = await fetch(isRefresh ? '/api/quote/random' : '/api/quote/daily');
      let quoteData = await quoteRes.json();

      if (quoteData.action === 'fetch_gemini') {
        try {
          const { GoogleGenAI, Type } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Provide a random inspirational or spiritual quote centered on Nonduality. Ensure it is unique and different from common quotes. Random seed: ${Math.random()}`,
            config: {
              temperature: 1.0,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  author: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ['text', 'author', 'category']
              }
            }
          });
          
          let aiText = response.text || '{}';
          const aiQuote = JSON.parse(aiText);
          
          const saveRes = await fetch('/api/quote/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiQuote)
          });
          quoteData = await saveRes.json();
        } catch (aiError) {
          console.error('AI fetch error:', aiError);
          quoteData = {
            id: 'fallback',
            text: "The quieter you become, the more you are able to hear.",
            author: "Rumi",
            category: "Sufism",
            source: "fallback",
            used: true,
            usedDate: new Date(),
            createdAt: new Date()
          };
        }
      }

      setQuote(quoteData);
      console.log('Received quote:', quoteData);

      const bgRes = await fetch('/api/background');
      const bgData = await bgRes.json();
      setBgImage(bgData.url);

      const logoRes = await fetch('/api/logo');
      if (logoRes.ok) {
        const logoData = await logoRes.json();
        setLogo(logoData.url);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteAndBg();
  }, []);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      // Temporarily hide UI elements
      const uiElements = cardRef.current.querySelectorAll('.no-capture');
      uiElements.forEach(el => (el as HTMLElement).style.display = 'none');

      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      // Restore UI elements
      uiElements.forEach(el => (el as HTMLElement).style.display = '');

      // Check luminance for watermark (simplified)
      const ctx = canvas.getContext('2d');
      let isDark = false;
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          r += imageData.data[i];
          g += imageData.data[i + 1];
          b += imageData.data[i + 2];
        }
        const pixels = imageData.data.length / 4;
        const avgLuminance = (0.299 * (r / pixels) + 0.587 * (g / pixels) + 0.114 * (b / pixels));
        isDark = avgLuminance < 128;
      }

      // Add watermark
      if (ctx) {
        ctx.font = '24px "Cormorant Garamond"';
        ctx.fillStyle = isDark ? 'rgba(250, 247, 242, 0.7)' : 'rgba(28, 28, 30, 0.7)';
        ctx.textAlign = 'right';
        ctx.fillText('Nonduality Daily', canvas.width * 0.85, canvas.height - 40);
      }

      const link = document.createElement('a');
      link.download = `quote-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const shareText = quote ? `"${quote.text}" — ${quote.author}` : '';
  const shareUrl = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    alert('Copied to clipboard!');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1C1C1E] flex items-center justify-center">
      <Link 
        to="/admin" 
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-[#FAF7F2]/10 hover:bg-[#FAF7F2]/20 text-[#FAF7F2] transition-colors no-capture"
        title="Admin Dashboard"
      >
        <Settings size={20} />
      </Link>
      
      <AnimatePresence mode="wait">
        {bgImage && (
          <motion.div
            key={bgImage}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="absolute inset-0 z-0"
          >
            <img
              src={bgImage}
              alt="Background"
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        ref={cardRef}
        className="relative z-10 w-full max-w-4xl px-6 py-12 md:p-16 flex flex-col items-center justify-center min-h-screen"
      >
        {/* Logo */}
        {logo && (
          <div className="mb-auto mt-8">
            <img src={logo} alt="Logo" className="w-[300px] h-[100px] object-contain" referrerPolicy="no-referrer" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {!loading && quote ? (
            <motion.div
              key={quote.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center w-full"
            >
              {quote.category && (
                <div className="mb-8 inline-block px-4 py-1.5 rounded-full border border-ivory/30 text-ivory/80 text-xs tracking-[0.2em] uppercase font-sans">
                  {quote.category}
                </div>
              )}
              
              <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight md:leading-tight text-ivory mb-6 drop-shadow-lg">
                "{quote.text}"
              </h1>
              
              <div className="font-sans text-gold text-sm md:text-base tracking-[0.2em] uppercase mb-12">
                — {quote.author}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-ivory/50 font-serif text-2xl"
            >
              Breathing...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls - Moved up slightly to ensure space */}
        <div className="mt-auto pb-12 flex justify-center items-center gap-6 no-capture z-20">
          <button
            onClick={() => fetchQuoteAndBg(true)}
            disabled={loading}
            className="p-3 rounded-full bg-ivory/10 hover:bg-ivory/20 text-ivory transition-colors disabled:opacity-50"
            title="Refresh Quote"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="p-3 rounded-full bg-ivory/10 hover:bg-ivory/20 text-ivory transition-colors"
              title="Share"
            >
              <Share2 size={20} />
            </button>
            
            <AnimatePresence>
              {showShareMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-ivory text-charcoal rounded-2xl p-2 shadow-xl flex gap-2"
                >
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="p-2 hover:bg-black/5 rounded-full transition-colors"><Twitter size={18} /></a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="p-2 hover:bg-black/5 rounded-full transition-colors"><Facebook size={18} /></a>
                  <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} target="_blank" rel="noreferrer" className="p-2 hover:bg-black/5 rounded-full transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" /></svg></a>
                  <button onClick={() => { alert('To share on Instagram, please download the image and upload it manually.'); handleDownload(); }} className="p-2 hover:bg-black/5 rounded-full transition-colors" title="Instagram"><Instagram size={18} /></button>
                  <button onClick={handleCopy} className="p-2 hover:bg-black/5 rounded-full transition-colors"><Copy size={18} /></button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleDownload}
            className="p-3 rounded-full bg-ivory/10 hover:bg-ivory/20 text-ivory transition-colors"
            title="Download Image"
          >
            <Download size={20} />
          </button>

          <button
            onClick={() => setShowEmbedCode(!showEmbedCode)}
            className="p-3 rounded-full bg-ivory/10 hover:bg-ivory/20 text-ivory transition-colors"
            title="Embed"
          >
            <Code size={20} />
          </button>
        </div>

        {/* Embed Modal */}
        <AnimatePresence>
          {showEmbedCode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-capture"
              onClick={() => setShowEmbedCode(false)}
            >
              <div 
                className="bg-ivory text-charcoal p-8 rounded-3xl max-w-2xl w-full"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="font-serif text-2xl mb-6">Embed this quote</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-sage">Iframe Embed</label>
                    <div className="relative">
                      <textarea 
                        readOnly 
                        className="w-full bg-black/5 p-4 rounded-xl font-mono text-sm h-24 resize-none"
                        value={`<iframe src="${window.location.origin}/embed/daily-quote?theme=light" width="100%" height="300" frameborder="0"></iframe>`}
                      />
                      <button 
                        onClick={() => navigator.clipboard.writeText(`<iframe src="${window.location.origin}/embed/daily-quote?theme=light" width="100%" height="300" frameborder="0"></iframe>`)}
                        className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-sage">JavaScript Snippet</label>
                    <div className="relative">
                      <textarea 
                        readOnly 
                        className="w-full bg-black/5 p-4 rounded-xl font-mono text-sm h-24 resize-none"
                        value={`<div id="nonduality-quote-widget"></div>\n<script src="${window.location.origin}/embed/widget.js" async></script>`}
                      />
                      <button 
                        onClick={() => navigator.clipboard.writeText(`<div id="nonduality-quote-widget"></div>\n<script src="${window.location.origin}/embed/widget.js" async></script>`)}
                        className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={() => setShowEmbedCode(false)}
                    className="px-6 py-2 bg-charcoal text-ivory rounded-full hover:bg-charcoal/90 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

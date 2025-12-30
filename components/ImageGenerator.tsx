
import React from 'react';

interface ImageGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-serif">
      <div className="bg-[#1a1a1a] border border-neutral-700 w-full max-w-sm rounded-lg shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-900 rounded-t-lg">
          <h3 className="text-neutral-200 font-bold tracking-widest flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-neutral-400">
              <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
              <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            战地影像记录
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white text-xl px-2">✕</button>
        </div>

        {/* Content */}
        <div className="p-8 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-neutral-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
            </div>
            
            <div className="text-neutral-300 font-bold">功能暂时不可用</div>
            <p className="text-xs text-neutral-500 leading-relaxed">
                当前连接的 DeepSeek AI 模型专注于战术推演与历史叙事，
                暂不支持图像生成功能。
            </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-700 bg-neutral-900 rounded-b-lg flex justify-center">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-neutral-800 text-neutral-300 text-sm border border-neutral-600 rounded hover:bg-neutral-700"
            >
                返回战场
            </button>
        </div>

      </div>
    </div>
  );
};

export default ImageGenerator;

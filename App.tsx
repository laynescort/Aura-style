
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Sparkles, Shirt, LayoutGrid, Palette, ChevronRight, Check, Loader2, Camera, RefreshCw, X, MessageSquare, User, UserCheck, Files, Info, Moon, Sun, Trash2, AlertCircle } from 'lucide-react';
import { Category, WardrobeItem, StylePreference, Combination, Gender } from './types';
import { WardrobeCard } from './components/WardrobeCard';
import { analyzeImage, suggestCombination, generateModelPreview } from './services/geminiService';

const STYLES: StylePreference[] = ['Günlük', 'Resmi', 'Sokak Stili', 'Randevu', 'Minimalist', 'Gece Şıklığı'];

export default function App() {
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(() => {
    const saved = localStorage.getItem('aura_wardrobe');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'stylist'>('wardrobe');
  const [selectedStyle, setSelectedStyle] = useState<StylePreference>('Günlük');
  const [selectedGender, setSelectedGender] = useState<Gender>('Kadın');
  const [customPrompt, setCustomPrompt] = useState('');
  const [combination, setCombination] = useState<Combination | null>(null);
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState({ current: 0, total: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('aura_theme') !== 'light');
  const [quotaLimitReached, setQuotaLimitReached] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('aura_wardrobe', JSON.stringify(wardrobe));
  }, [wardrobe]);

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('aura_theme', theme);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const processFile = async (file: File) => {
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    try {
      const analysis = await analyzeImage(base64Data);
      const newItem: WardrobeItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        imageUrl: `data:image/jpeg;base64,${base64Data}`,
        category: analysis.category as Category,
        color: analysis.color,
        tags: analysis.tags
      };

      // Update state immediately for this item
      setWardrobe(prev => [...prev, newItem]);
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        setQuotaLimitReached(true);
      }
      throw error;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    setIsAnalyzing(true);
    setQuotaLimitReached(false);
    setAnalyzingProgress({ current: 0, total: fileList.length });

    // Process items sequentially to prevent quota issues, but update UI per-item
    for (let i = 0; i < fileList.length; i++) {
      try {
        await processFile(fileList[i]);
        setAnalyzingProgress(prev => ({ ...prev, current: i + 1 }));
      } catch (error) {
        console.error(`${i + 1}. dosya işlenemedi:`, error);
        // Break if quota is hit to prevent spamming
        if (error?.message?.includes('429')) break;
      }
    }

    setIsAnalyzing(false);
    setAnalyzingProgress({ current: 0, total: 0 });
    if (event.target) event.target.value = '';
  };

  const deleteItem = (id: string) => {
    setWardrobe(prev => prev.filter(item => item.id !== id));
  };

  const generateOutfit = async (itemToReplaceId?: string) => {
    if (wardrobe.length < 2) {
      alert("Kombin yapabilmek için lütfen dolabınıza en az 2 parça ekleyin.");
      return;
    }

    setQuotaLimitReached(false);

    if (itemToReplaceId) {
      setReplacingItemId(itemToReplaceId);
    } else {
      setIsGenerating(true);
      setCombination(null);
      setModelImage(null);
    }
    
    let currentExclusions = [...excludedIds];
    if (itemToReplaceId) {
      currentExclusions.push(itemToReplaceId);
      setExcludedIds(currentExclusions);
    } else {
      setExcludedIds([]);
      currentExclusions = [];
    }
    
    try {
      const result = await suggestCombination(wardrobe, selectedStyle, customPrompt, currentExclusions);
      
      if (result.itemsIds.length === 0) {
        alert("Üzgünüz, bu seçim için alternatif bulunamadı.");
        setExcludedIds([]);
      } else {
        setCombination(result);
        const selectedItems = result.itemsIds.map(id => wardrobe.find(w => w.id === id)!).filter(Boolean);
        const preview = await generateModelPreview(selectedItems, selectedStyle, selectedGender, customPrompt);
        setModelImage(preview);
      }
    } catch (error: any) {
      console.error("Hata:", error);
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        setQuotaLimitReached(true);
      } else {
        alert("Bir sorun oluştu.");
      }
    } finally {
      setIsGenerating(false);
      setReplacingItemId(null);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-x-hidden ${isDarkMode ? 'bg-[#0F1115] text-slate-100' : 'bg-[#FDFCFB] text-slate-900'}`}>
      {/* Dynamic Background Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-40">
        <div className="absolute -top-[10%] -left-[10%] w-[80%] md:w-[40%] h-[40%] bg-blue-500/30 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] -right-[10%] w-[60%] md:w-[30%] h-[50%] bg-indigo-500/20 blur-[120px] rounded-full" />
      </div>

      {/* Premium Header */}
      <header className={`sticky top-0 z-50 border-b transition-all duration-300 backdrop-blur-2xl ${isDarkMode ? 'bg-black/60 border-white/5' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-4 group cursor-pointer">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black dark:bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl">
              <Sparkles className={isDarkMode ? 'text-black' : 'text-white'} size={20} />
            </div>
            <div className="hidden xs:block">
              <h1 className="font-display text-lg sm:text-2xl font-bold tracking-tight">AURA STYLE</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.2em] sm:tracking-[0.4em] text-slate-400 dark:text-slate-500 uppercase">Pro Stylist AI</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-6">
            <nav className={`flex p-1 rounded-xl sm:rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
              <button 
                onClick={() => setActiveTab('wardrobe')}
                className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'wardrobe' ? (isDarkMode ? 'bg-white text-black' : 'bg-white text-black shadow-md') : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Dolabım
              </button>
              <button 
                onClick={() => setActiveTab('stylist')}
                className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'stylist' ? (isDarkMode ? 'bg-white text-black' : 'bg-white text-black shadow-md') : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Stilist
              </button>
            </nav>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-yellow-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-32 sm:pb-40">
        {quotaLimitReached && (
          <div className="mb-8 flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 animate-in slide-in-from-top-4 duration-500">
            <AlertCircle className="flex-shrink-0" size={24} />
            <div>
              <p className="font-bold">Günlük Kullanım Limitine Ulaşıldı</p>
              <p className="text-sm opacity-80 text-red-400">Yapay zeka çok yoğun çalışıyor. Lütfen birkaç dakika sonra tekrar deneyin.</p>
            </div>
          </div>
        )}

        {activeTab === 'wardrobe' ? (
          <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-1000">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="space-y-1 sm:space-y-2">
                <h2 className="text-3xl sm:text-5xl font-display font-bold">Gardırobun</h2>
                <p className="text-slate-500 text-sm sm:text-lg">Toplam <span className="text-blue-500 font-bold">{wardrobe.length}</span> parça analiz edildi.</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="group relative flex items-center justify-center gap-3 bg-black dark:bg-white text-white dark:text-black px-6 sm:px-10 py-4 sm:py-5 rounded-2xl sm:rounded-3xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                {isAnalyzing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span className="font-bold text-xs sm:text-base">{analyzingProgress.current}/{analyzingProgress.total} İnceleniyor</span>
                  </>
                ) : (
                  <>
                    <Files size={20} />
                    <span className="font-bold text-xs sm:text-base">Kıyafetlerini Yükle</span>
                  </>
                )}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
            </div>

            {wardrobe.length === 0 ? (
              <div className={`border-2 border-dashed rounded-[2.5rem] sm:rounded-[4rem] p-16 sm:p-32 text-center transition-all ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                  <Shirt className="text-blue-500 w-9 h-9 sm:w-12 sm:h-12" />
                </div>
                <h3 className="text-xl sm:text-3xl font-bold">Henüz Kıyafet Yok</h3>
                <p className="text-slate-500 max-w-xs sm:max-w-md mx-auto mt-4 text-sm sm:text-xl">Kıyafetlerinin fotoğrafını yükle, AI gerisini halletsin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-10">
                {wardrobe.map(item => (
                  <WardrobeCard key={item.id} item={item} onDelete={deleteItem} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-12 sm:space-y-20 animate-in slide-in-from-bottom-12 duration-1000">
            {/* Control Panel */}
            <section className={`rounded-[2.5rem] sm:rounded-[4rem] p-6 sm:p-12 md:p-20 border transition-all relative overflow-hidden shadow-2xl ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100'}`}>
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 animate-gradient-x" />
              
              <div className="text-center max-w-4xl mx-auto space-y-10 sm:space-y-16">
                <div className="space-y-2 sm:space-y-4">
                  <h2 className="text-3xl sm:text-6xl font-display font-bold tracking-tight">Stilini Keşfet</h2>
                  <p className="text-slate-500 text-base sm:text-xl font-medium">Dolabını moda zekası ile canlandır.</p>
                </div>
                
                {/* Gender selection */}
                <div className="space-y-4 sm:space-y-8">
                  <label className="text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] text-slate-400 font-black flex items-center justify-center gap-3">
                    MODEL TERCİHİ
                  </label>
                  <div className="flex justify-center gap-4 sm:gap-8">
                    {(['Kadın', 'Erkek'] as Gender[]).map(gender => (
                      <button
                        key={gender}
                        onClick={() => setSelectedGender(gender)}
                        className={`group relative px-6 sm:px-14 py-3 sm:py-5 rounded-2xl sm:rounded-3xl border-2 transition-all duration-500 font-black text-xs sm:text-sm tracking-wide ${
                          selectedGender === gender 
                            ? 'border-blue-500 bg-black dark:bg-white text-white dark:text-black shadow-xl scale-105' 
                            : 'border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 text-slate-400'
                        }`}
                      >
                        {gender.toUpperCase()} MODEL
                      </button>
                    ))}
                  </div>
                </div>

                {/* Styles grid */}
                <div className="space-y-4 sm:space-y-8">
                  <label className="text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] text-slate-400 font-black flex items-center justify-center gap-3">
                    STİL SEÇİMİ
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                    {STYLES.map(style => (
                      <button
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        className={`px-3 py-4 sm:py-6 rounded-2xl sm:rounded-3xl border transition-all duration-300 font-bold text-xs sm:text-base ${
                          selectedStyle === style 
                            ? 'border-blue-500 bg-black dark:bg-white text-white dark:text-black shadow-xl scale-[1.02]' 
                            : 'border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 text-slate-500'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input */}
                <div className="space-y-4 sm:space-y-8 text-left">
                  <label className="text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] text-slate-400 font-black flex items-center justify-center gap-3">
                    ÖZEL İSTEK
                  </label>
                  <div className="relative max-w-2xl mx-auto group">
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Örn: Akşam yemeği için siyah bir şıklık..."
                      className={`relative w-full px-6 sm:px-10 py-5 sm:py-7 rounded-2xl sm:rounded-[2.2rem] border transition-all text-sm sm:text-xl outline-none shadow-inner ${
                        isDarkMode 
                        ? 'bg-black/40 border-white/10 text-white focus:border-blue-500' 
                        : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-4 sm:pt-10">
                  <button
                    onClick={() => generateOutfit()}
                    disabled={isGenerating || wardrobe.length < 2}
                    className="group relative w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-10 sm:px-24 py-5 sm:py-7 rounded-full font-black text-lg sm:text-2xl hover:shadow-2xl transition-all flex items-center justify-center gap-4 disabled:opacity-50 mx-auto"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin w-6 h-6 sm:w-8 sm:h-8" />
                        <span>TASARLANIYOR...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                        <span>KOMBİNİ TASARLA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Premium Results View */}
            {combination && (
              <div className={`rounded-[2.5rem] sm:rounded-[5rem] shadow-2xl overflow-hidden border transition-all duration-1000 animate-in zoom-in-95 relative ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100'}`}>
                <div className="p-6 sm:p-10 md:p-20 relative z-10">
                  <div className="flex flex-col lg:flex-row gap-10 sm:gap-24">
                    {/* Visual Area */}
                    <div className="lg:w-[48%]">
                      <div className={`relative aspect-[3/4] rounded-[2rem] sm:rounded-[4rem] overflow-hidden shadow-xl border-4 sm:border-8 transition-all ${isDarkMode ? 'border-black/50 ring-1 ring-white/10' : 'border-white ring-1 ring-slate-100'}`}>
                        {modelImage ? (
                          <img src={modelImage} alt="Style Result" className="w-full h-full object-cover animate-in fade-in duration-1000" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-slate-900/5 dark:bg-white/5">
                            <Loader2 className="animate-spin text-blue-500" size={48} />
                            <p className="text-sm font-black tracking-tight uppercase">Görsel İşleniyor...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Swapping */}
                    <div className="flex-1 space-y-10 sm:space-y-14">
                      <div className="space-y-4 sm:space-y-6 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-4">
                          <span className="px-3 py-1 sm:px-5 sm:py-2 bg-blue-500/10 text-blue-500 rounded-xl text-[10px] sm:text-xs font-black tracking-widest uppercase">
                            {selectedStyle}
                          </span>
                        </div>
                        <h3 className="text-3xl sm:text-6xl font-display font-bold leading-tight">{combination.title}</h3>
                        <p className="text-slate-400 text-sm sm:text-2xl leading-relaxed font-medium">{combination.description}</p>
                      </div>

                      {/* Items Row */}
                      <div className="space-y-4 sm:space-y-8">
                        <h4 className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-slate-500">KULLANILAN PARÇALAR</h4>
                        <div className="grid grid-cols-2 gap-4 sm:gap-8">
                          {combination.itemsIds.map(id => {
                            const item = wardrobe.find(w => w.id === id);
                            if (!item) return null;
                            const isReplacing = replacingItemId === id;
                            return (
                              <div key={id} className={`group relative aspect-square rounded-[1.5rem] sm:rounded-[3rem] overflow-hidden border transition-all ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-50 bg-slate-50'}`}>
                                <img src={item.imageUrl} alt={item.category} className={`w-full h-full object-cover transition-all ${isReplacing ? 'blur-sm opacity-50' : ''}`} />
                                
                                <div className={`absolute inset-0 bg-black/60 flex items-center justify-center p-4 text-center opacity-0 hover:opacity-100 transition-all ${isReplacing ? 'opacity-100' : ''}`}>
                                  {isReplacing ? (
                                    <Loader2 className="animate-spin text-white" size={24} />
                                  ) : (
                                    <button 
                                      onClick={() => generateOutfit(id)}
                                      className="w-full py-2 sm:py-3 bg-white text-black rounded-xl font-black text-[10px] tracking-widest uppercase"
                                    >
                                      DEĞİŞTİR
                                    </button>
                                  )}
                                </div>

                                <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/80 px-2 py-1 rounded-lg text-[8px] font-black text-slate-800 dark:text-white">
                                  {item.category.toUpperCase()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-8 sm:pt-12 border-t border-white/10 space-y-6 sm:space-y-8">
                        <h4 className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-slate-500">STİLİSTİN NOTLARI</h4>
                        <div className="grid gap-4 sm:gap-6">
                          {combination.stylingTips.map((tip, idx) => (
                            <div key={idx} className={`flex items-start gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                              <Check className="text-blue-500 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" strokeWidth={4} />
                              <span className="text-sm sm:text-lg font-bold leading-relaxed">{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-6 sm:pt-10">
                        <button 
                          onClick={() => generateOutfit()}
                          className="w-full py-4 sm:py-6 bg-black dark:bg-white text-white dark:text-black rounded-2xl sm:rounded-3xl font-black text-sm sm:text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                        >
                          <RefreshCw size={20} />
                          KOMBINI YENİLE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action for Mobile */}
      {activeTab === 'wardrobe' && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50 md:hidden">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-4 bg-blue-600 text-white py-5 rounded-2xl shadow-2xl active:scale-95 transition-all font-black uppercase tracking-widest text-sm"
          >
            <Camera size={22} />
            <span>Fotoğraf Çek veya Yükle</span>
          </button>
        </div>
      )}
    </div>
  );
}

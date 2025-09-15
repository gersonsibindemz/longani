import React, { useState, useCallback, useEffect } from 'react';
import { transcribeAudio, cleanTranscript } from './services/geminiService';
import { Header, longaniLogoUrl } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { ProgressBar } from './components/ProgressBar';
import { Loader } from './components/Loader';
import { ArrowRightIcon, ReloadIcon, ClockIcon, TargetIcon, InfoIcon, HistoryIcon, ColumnsIcon } from './components/Icons';
import { getAudioDuration, estimateProcessingTime, estimatePrecisionPotential, calculateDynamicPrecision, getFriendlyErrorMessage } from './utils/audioUtils';
import { ThemeSwitcher } from './components/ThemeSwitcher';

type ProcessStage = 'idle' | 'transcribing' | 'cleaning' | 'completed';
export type Theme = 'system' | 'light' | 'dark';
type ExpandedTranscript = 'raw' | 'cleaned' | 'none';
type OutputPreference = 'both' | 'raw' | 'cleaned';

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [cleanedTranscript, setCleanedTranscript] = useState<string>('');
  const [processStage, setProcessStage] = useState<ProcessStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [precisionPotential, setPrecisionPotential] = useState<number | null>(null);
  const [initialPrecision, setInitialPrecision] = useState<number | null>(null);
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [isPWA, setIsPWA] = useState(false);
  const [expandedTranscript, setExpandedTranscript] = useState<ExpandedTranscript>('none');
  const [fileSelectionSuccess, setFileSelectionSuccess] = useState(false);
  const [outputPreference, setOutputPreference] = useState<OutputPreference>('both');
  const [isEffectivelyDark, setIsEffectivelyDark] = useState(false);

  const MAX_FILE_SIZE_MB = 25; // Increased file size limit
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  // This useEffect runs once on mount to detect PWA, load theme, and handle initial loading animation.
  useEffect(() => {
    const pwaQuery = window.matchMedia('(display-mode: standalone)');
    if (pwaQuery.matches) {
      setIsPWA(true);
      const storedTheme = localStorage.getItem('theme') as Theme | null;
      if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
        setTheme(storedTheme);
      }
      // For PWA, show the app immediately without a video splash screen.
      setIsAppVisible(true);
    } else {
      // For non-PWA, use image preloading.
      const img = new Image();
      img.src = longaniLogoUrl;
      const showApp = () => setIsAppVisible(true);

      img.onload = showApp;
      img.onerror = showApp; // Show app even if logo fails

      // Fallback timer for cached images
      const timer = setTimeout(showApp, 2500);

      return () => {
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
      };
    }
  }, []);

  // This useEffect handles applying the theme and saving the preference.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleThemeChange = () => {
      // Determine if dark mode should be active
      const isDark =
        theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      
      setIsEffectivelyDark(isDark);

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    handleThemeChange();
    
    if (isPWA) {
      try {
        localStorage.setItem('theme', theme);
      } catch (e) {
        console.warn('Não foi possível guardar o tema no localStorage:', e);
      }
    }
    
    mediaQuery.addEventListener('change', handleThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [theme, isPWA]);

  useEffect(() => {
    // This feature is only for installed PWAs on mobile-like devices where a back button closes the app
    if (isPWA) {
        let allowExit = false;
        // Use ReturnType<typeof setTimeout> for cross-environment compatibility of timer IDs.
        let exitTimer: ReturnType<typeof setTimeout> | null = null;

        const handleBackButton = (event: PopStateEvent) => {
            if (!allowExit) {
                // Prevent exit on first press
                history.pushState(null, '', location.href);

                setShowExitToast(true);
                allowExit = true;

                if (exitTimer) clearTimeout(exitTimer);
                exitTimer = setTimeout(() => {
                    setShowExitToast(false);
                    allowExit = false;
                }, 2000); // 2-second window to press back again
            }
            // On second press, allowExit is true, so we do nothing, letting the back navigation proceed.
        };
        
        // Push an initial state to be able to intercept the first back press
        history.pushState(null, '', location.href);
        window.addEventListener('popstate', handleBackButton);

        return () => {
            window.removeEventListener('popstate', handleBackButton);
            if (exitTimer) clearTimeout(exitTimer);
        };
    }
  }, [isPWA]);

  // Effect to clean up the audio object URL to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);


  const handleReset = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
    setRawTranscript('');
    setCleanedTranscript('');
    setError(null);
    setProcessStage('idle');
    setFileInputKey(Date.now());
    setEstimatedTime(null);
    setPrecisionPotential(null);
    setInitialPrecision(null);
    setExpandedTranscript('none');
    setFileSelectionSuccess(false);
    setOutputPreference('both');
  }, [audioUrl]);

  const handleFileChange = async (file: File | null) => {
    handleReset();

    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`O ficheiro excede o limite de ${MAX_FILE_SIZE_MB} MB. Por favor, escolha um ficheiro mais pequeno.`);
        setAudioFile(null);
        setAudioUrl(null);
        setFileInputKey(Date.now()); 
        return;
      }
      
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setFileSelectionSuccess(true);

      try {
        const duration = await getAudioDuration(file);
        setEstimatedTime(estimateProcessingTime(duration));
        const potential = estimatePrecisionPotential(file.name);
        setPrecisionPotential(potential);
        setInitialPrecision(potential);
      } catch (err) {
        console.error('Erro ao obter metadados do áudio:', err);
        const errorMessage = 'Não foi possível ler a duração do áudio. O ficheiro pode estar corrompido ou num formato não suportado.';
        setError(`${errorMessage} As estimativas não estão disponíveis, mas ainda pode processar o ficheiro.`);
        setEstimatedTime(null);
        setPrecisionPotential(null);
        setInitialPrecision(null);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        if (result && result.includes(',')) {
            const base64String = result.split(',')[1];
            resolve(base64String);
        } else {
            reject(new Error('Falha ao converter o ficheiro para Base64. Formato inválido.'));
        }
      };
      reader.onerror = () => {
        reader.abort();
        reject(new Error(`Não foi possível ler o ficheiro: ${file.name}. Pode estar corrompido ou o navegador pode não ter permissão.`));
      };
    });
  };

  const handleProcessAudio = useCallback(async () => {
    if (!audioFile) {
      setError('Por favor, selecione primeiro um ficheiro de áudio.');
      return;
    }
  
    // Generate a unique ID for this transcription job for future tracking
    const transcriptionId = `longani-job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    console.log(`Starting processing for job ID: ${transcriptionId}`);

    setError(null);
    setRawTranscript('');
    setCleanedTranscript('');
  
    try {
      const audioBase64 = await fileToBase64(audioFile);
      const audioMimeType = audioFile.type;
  
      const BATCH_UPDATE_INTERVAL = 100; // ms
  
      // --- Transcribing with batched updates ---
      setProcessStage('transcribing');
      let fullRawTranscript = '';
      let lastRawUpdate = 0;
      for await (const chunk of transcribeAudio(audioBase64, audioMimeType)) {
        fullRawTranscript += chunk;
        const now = Date.now();
        if (now - lastRawUpdate > BATCH_UPDATE_INTERVAL) {
          setRawTranscript(fullRawTranscript);
          if (initialPrecision !== null) {
              const dynamicPrecision = calculateDynamicPrecision(fullRawTranscript, initialPrecision);
              setPrecisionPotential(dynamicPrecision);
          }
          lastRawUpdate = now;
        }
      }
      setRawTranscript(fullRawTranscript); // Final update with any remaining text
  
      if (initialPrecision !== null) {
        const dynamicPrecision = calculateDynamicPrecision(fullRawTranscript, initialPrecision);
        setPrecisionPotential(dynamicPrecision);
      }

      // --- Cleaning with batched updates ---
      if (fullRawTranscript.trim()) {
        setProcessStage('cleaning');
        let fullCleanedTranscript = '';
        let lastCleanedUpdate = 0;
        for await (const chunk of cleanTranscript(fullRawTranscript)) {
          fullCleanedTranscript += chunk;
          const now = Date.now();
          if (now - lastCleanedUpdate > BATCH_UPDATE_INTERVAL) {
            setCleanedTranscript(fullCleanedTranscript);
            lastCleanedUpdate = now;
          }
        }
        setCleanedTranscript(fullCleanedTranscript); // Final update
      } else {
        setCleanedTranscript('');
      }
      
      setProcessStage('completed');
  
    } catch (err) {
      const friendlyMessage = getFriendlyErrorMessage(err, transcriptionId);
      setError(friendlyMessage);
      setProcessStage('idle');
    }
  }, [audioFile, initialPrecision]);

  const handleToggleTranscript = (transcriptType: 'raw' | 'cleaned') => {
    setExpandedTranscript(current => (current === transcriptType ? 'none' : transcriptType));
  };
  
  const isProcessing = processStage === 'transcribing' || processStage === 'cleaning';
  const isAccordionMode = processStage === 'completed';
  const finalDisplayIsSingleColumn = processStage === 'completed' && outputPreference !== 'both';

  return (
    <>
      <div className={`min-h-screen flex flex-col transition-opacity duration-500 ease-in-out ${isAppVisible ? 'opacity-100' : 'opacity-0'}`}>
        <Header />
        <main className="container mx-auto px-4 py-8 flex-grow">
          <h3 className="max-w-3xl mx-auto text-xl md:text-2xl font-light text-center text-gray-700 dark:text-gray-300 mb-8">
            Transforme seu áudio em texto profissional, pronto para usar.
          </h3>
          <div className="max-w-3xl mx-auto bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
            
            <div className="flex flex-col sm:flex-row gap-4 items-start justify-center mb-4">
              {processStage === 'idle' && (
                <div className="w-full sm:w-auto">
                  <FileUpload key={fileInputKey} onFileChange={handleFileChange} disabled={isProcessing} fileSelected={fileSelectionSuccess} />
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-2 text-center sm:text-left">
                    Ficheiros de áudio suportados (.mp3, .wav, .m4a, etc.) com um limite de {MAX_FILE_SIZE_MB}MB.
                  </p>
                </div>
              )}
              
              {processStage === 'completed' ? (
                <button
                  onClick={handleReset}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400 transition-all duration-300 transform hover:scale-105"
                >
                  <ReloadIcon />
                  <span>Nova Transcrição</span>
                </button>
              ) : (
                <button
                  onClick={handleProcessAudio}
                  disabled={!audioFile || isProcessing}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-[#24a9c5] text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-[#1e8a9f] disabled:bg-[#d3eef4] dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-gray-400 transition-all duration-300 transform hover:scale-105 ${processStage !== 'idle' ? 'flex-grow sm:flex-grow-0' : ''}`}
                >
                  {isProcessing ? (
                    <Loader className="-ml-1 mr-2 text-white" />
                  ) : (
                    <ArrowRightIcon />
                  )}
                  <span>
                    {isProcessing ? (processStage === 'transcribing' ? 'A transcrever...' : 'A otimizar...') : 'Iniciar Processo'}
                  </span>
                </button>
              )}
            </div>
            
            {audioFile && processStage === 'idle' && (estimatedTime || precisionPotential !== null) && (
              <div className="mt-4 text-left p-4 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-y-4">
                      {estimatedTime && (
                          <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                              <ClockIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                              <div>
                                  <div className="flex items-center gap-1.5">
                                      <p className="font-semibold">Tempo Estimado</p>
                                      <div className="group relative flex items-center cursor-help">
                                          <InfoIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 dark:bg-gray-200 dark:text-gray-800">
                                              Este é o tempo aproximado que o processo de transcrição e otimização irá demorar.
                                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-800 dark:border-t-gray-200"></div>
                                          </div>
                                      </div>
                                  </div>
                                  <p className="text-gray-600 dark:text-gray-400">{estimatedTime}</p>
                              </div>
                          </div>
                      )}
                      {precisionPotential !== null && (
                         <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                             <TargetIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                             <div className="w-full">
                                 <div className="flex justify-between items-baseline mb-1">
                                     <div className="flex items-center gap-1.5">
                                         <p className="font-semibold">Potencial de Precisão</p>
                                         <div className="group relative flex items-center cursor-help">
                                             <InfoIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 dark:bg-gray-200 dark:text-gray-800">
                                                 Esta percentagem reflete a qualidade do ficheiro de áudio. Formatos de alta qualidade (como WAV) tendem a ter maior precisão na transcrição.
                                                 <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-800 dark:border-t-gray-200"></div>
                                             </div>
                                         </div>
                                     </div>
                                     <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{precisionPotential}<span className="text-sm">%</span></p>
                                 </div>
                                 <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                     <div className="bg-gradient-to-r from-[#24a9c5] to-[#1e8a9f] h-2 rounded-full" style={{ width: `${precisionPotential}%` }}></div>
                                 </div>
                             </div>
                         </div>
                      )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <ColumnsIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                      <div>
                        <p id="output-preference-label" className="font-semibold mb-2">Visualização do Resultado</p>
                        <div role="radiogroup" aria-labelledby="output-preference-label" className="flex flex-wrap gap-2">
                          <button role="radio" aria-checked={outputPreference === 'both'} onClick={() => setOutputPreference('both')} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${outputPreference === 'both' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>
                            Ambos
                          </button>
                          <button role="radio" aria-checked={outputPreference === 'raw'} onClick={() => setOutputPreference('raw')} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${outputPreference === 'raw' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>
                            Apenas Literal
                          </button>
                          <button role="radio" aria-checked={outputPreference === 'cleaned'} onClick={() => setOutputPreference('cleaned')} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${outputPreference === 'cleaned' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>
                            Apenas Formatado
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <strong>Nota:</strong> As estimativas são calculadas com base nas características técnicas do ficheiro. A precisão final depende da clareza do áudio, ruído de fundo e sotaques.
                    </p>
                  </div>
              </div>
            )}

            {error && <div className="text-center text-red-800 bg-red-100 p-3 my-4 rounded-lg border border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800/50">{error}</div>}

            {processStage !== 'idle' && (
              <div className="mt-6">
                {audioFile && (
                  <div className="mb-6 text-center p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">A processar o ficheiro:</p>
                      {isProcessing ? (
                          <div className="relative w-full flex overflow-x-hidden h-7 items-center">
                              <div className="animate-marquee whitespace-nowrap flex items-center">
                                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200 px-4">
                                      {audioFile.name}
                                  </p>
                              </div>
                              <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center h-full">
                                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200 px-4">
                                      {audioFile.name}
                                  </p>
                              </div>
                          </div>
                      ) : (
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200 truncate px-4">
                              {audioFile.name}
                          </p>
                      )}
                      <div className="mt-2 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          {estimatedTime && (
                              <span className="flex items-center gap-1">
                                  <ClockIcon className="w-4 h-4" />
                                  <span>Tempo Est.: {estimatedTime}</span>
                              </span>
                          )}
                          {precisionPotential !== null && (
                              <span className="flex items-center gap-1">
                                  <TargetIcon className="w-4 h-4" />
                                  <span>Potencial: {precisionPotential}%</span>
                              </span>
                          )}
                      </div>
                  </div>
                )}
                <ProgressBar stage={processStage} />
              </div>
            )}
          </div>
          
          {(rawTranscript || cleanedTranscript || isProcessing) && (
              <div className={`mt-12 grid grid-cols-1 ${finalDisplayIsSingleColumn ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-8`}>
                  {(isProcessing || (processStage === 'completed' && (outputPreference === 'raw' || outputPreference === 'both'))) && <TranscriptDisplay 
                      title="Texto Literal"
                      text={rawTranscript}
                      isLoading={processStage === 'transcribing'}
                      isComplete={processStage !== 'transcribing' && rawTranscript.length > 0}
                      isExpanded={!isAccordionMode || expandedTranscript === 'raw'}
                      isClickable={isAccordionMode}
                      onToggle={() => handleToggleTranscript('raw')}
                      audioUrl={processStage === 'completed' ? audioUrl : null}
                  />}
                  {(isProcessing || (processStage === 'completed' && (outputPreference === 'cleaned' || outputPreference === 'both'))) && <TranscriptDisplay 
                      title="Texto Formatado"
                      text={cleanedTranscript}
                      isLoading={processStage === 'cleaning'}
                      isComplete={processStage === 'completed' && cleanedTranscript.length > 0}
                      placeholder={processStage === 'cleaning' || processStage === 'completed' ? "A aguardar pela otimização..." : "O resultado aparecerá aqui."}
                      renderAsHTML={true}
                      isExpanded={!isAccordionMode || expandedTranscript === 'cleaned'}
                      isClickable={isAccordionMode}
                      onToggle={() => handleToggleTranscript('cleaned')}
                  />}
              </div>
          )}
        </main>
        <footer className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm select-none">
          <p>
            © {new Date().getFullYear()} Longani &middot; v0.9.0
          </p>
        </footer>
        {showExitToast && (
            <div
              role="status"
              aria-live="polite"
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-4 py-2 rounded-full text-sm shadow-lg select-none z-[100] animate-fade-in-up"
            >
              Pressione novamente para sair
            </div>
        )}
        {isPWA && <ThemeSwitcher setTheme={setTheme} isEffectivelyDark={isEffectivelyDark} />}
      </div>
    </>
  );
};

export default App;
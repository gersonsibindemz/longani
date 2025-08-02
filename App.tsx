
import React, { useState, useCallback, useEffect } from 'react';
import { transcribeAudio, cleanTranscript } from './services/geminiService';
import { Header, longaniLogoUrl } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { ProgressBar } from './components/ProgressBar';
import { Loader } from './components/Loader';
import { ArrowRightIcon, ReloadIcon, ClockIcon, TargetIcon } from './components/Icons';
import { getAudioDuration, estimateProcessingTime, estimatePrecisionPotential } from './utils/audioUtils';
import { FeedbackPopup } from './components/FeedbackPopup';


type ProcessStage = 'idle' | 'transcribing' | 'cleaning' | 'completed';

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [cleanedTranscript, setCleanedTranscript] = useState<string>('');
  const [processStage, setProcessStage] = useState<ProcessStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [precisionPotential, setPrecisionPotential] = useState<number | null>(null);
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);

  const MAX_FILE_SIZE_MB = 15;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  useEffect(() => {
    const img = new Image();
    img.src = longaniLogoUrl;
    const showApp = () => setIsAppVisible(true);

    img.onload = showApp;
    img.onerror = showApp; // Show app even if logo fails

    // Fallback timer in case the events don't fire (e.g., for cached images)
    const timer = setTimeout(showApp, 2500);

    return () => {
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
    };
  }, []);

  useEffect(() => {
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
      });
    }

    try {
        let deviceId = localStorage.getItem('longani_deviceId');
        if (!deviceId) {
            deviceId = generateUUID();
            localStorage.setItem('longani_deviceId', deviceId);
        }

        const feedbackSubmitted = localStorage.getItem('longani_feedbackSubmitted');
        const popupAlreadyShown = localStorage.getItem('longani_feedbackPopupShown');

        if (feedbackSubmitted || popupAlreadyShown) {
            return;
        }

        let visitCount = parseInt(localStorage.getItem('longani_visitCount') || '0', 10);
        visitCount++;
        localStorage.setItem('longani_visitCount', visitCount.toString());

        if (visitCount >= 3) {
            setShowFeedbackPopup(true);
            localStorage.setItem('longani_feedbackPopupShown', 'true');
        }
    } catch (error) {
        console.error("Could not access localStorage:", error);
    }
  }, []);

  const handleFeedbackSubmit = () => {
    try {
        localStorage.setItem('longani_feedbackSubmitted', 'true');
        setShowFeedbackPopup(false);
    } catch (error) {
        console.error("Could not set item in localStorage:", error);
        setShowFeedbackPopup(false);
    }
  };

  const handleFeedbackClose = () => {
    setShowFeedbackPopup(false);
  };

  const handleReset = useCallback(() => {
    setAudioFile(null);
    setRawTranscript('');
    setCleanedTranscript('');
    setError(null);
    setProcessStage('idle');
    setFileInputKey(Date.now());
    setEstimatedTime(null);
    setPrecisionPotential(null);
  }, []);

  const handleFileChange = async (file: File | null) => {
    handleReset();

    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`O ficheiro excede o limite de ${MAX_FILE_SIZE_MB} MB. Por favor, escolha um ficheiro mais pequeno.`);
        setAudioFile(null);
        setFileInputKey(Date.now()); 
        return;
      }
      
      setAudioFile(file);

      try {
        const duration = await getAudioDuration(file);
        setEstimatedTime(estimateProcessingTime(duration));
        setPrecisionPotential(estimatePrecisionPotential(file.name));
      } catch (err) {
        console.error(err);
        setEstimatedTime(null);
        setPrecisionPotential(null);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleProcessAudio = useCallback(async () => {
    if (!audioFile) {
      setError('Por favor, selecione primeiro um ficheiro de áudio.');
      return;
    }

    setError(null);
    setRawTranscript('');
    setCleanedTranscript('');

    try {
      const audioBase64 = await fileToBase64(audioFile);
      const audioMimeType = audioFile.type;

      setProcessStage('transcribing');
      let fullRawTranscript = '';
      for await (const chunk of transcribeAudio(audioBase64, audioMimeType)) {
        fullRawTranscript += chunk;
        setRawTranscript(fullRawTranscript);
      }
      
      if (fullRawTranscript.trim()) {
        setProcessStage('cleaning');
        let fullCleanedTranscript = '';
        for await (const chunk of cleanTranscript(fullRawTranscript)) {
          fullCleanedTranscript += chunk;
          setCleanedTranscript(fullCleanedTranscript);
        }
      } else {
        setCleanedTranscript('');
      }
      
      setProcessStage('completed');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
      setProcessStage('idle');
    }
  }, [audioFile]);
  
  const isProcessing = processStage === 'transcribing' || processStage === 'cleaning';

  return (
    <div className={`min-h-screen transition-opacity duration-500 ease-in-out ${isAppVisible ? 'opacity-100' : 'opacity-0'}`}>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h3 className="max-w-3xl mx-auto text-xl md:text-2xl font-light text-center text-gray-700 mb-8">
          Converta o seu áudio em texto transliterado, e transformado em documento com qualidade profissional.
        </h3>
        <div className="max-w-3xl mx-auto bg-white/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 backdrop-blur-sm">
          
          <div className="flex flex-col sm:flex-row gap-4 items-start justify-center mb-4">
            {processStage === 'idle' && (
              <div className="w-full sm:w-auto">
                <FileUpload key={fileInputKey} onFileChange={handleFileChange} disabled={isProcessing} />
                <p className="text-gray-500 text-xs mt-2 text-center sm:text-left">
                  Ficheiros de áudio suportados (.mp3, .wav, .m4a, etc.) com um limite de 15MB.
                </p>
              </div>
            )}
            
            {processStage === 'completed' ? (
              <button
                onClick={handleReset}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
              >
                <ReloadIcon />
                <span>Nova Transcrição</span>
              </button>
            ) : (
              <button
                onClick={handleProcessAudio}
                disabled={!audioFile || isProcessing}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-[#24a9c5] text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-[#1e8a9f] disabled:bg-[#d3eef4] disabled:cursor-not-allowed disabled:text-gray-500 transition-all duration-300 transform hover:scale-105 ${processStage !== 'idle' ? 'flex-grow sm:flex-grow-0' : ''}`}
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
            <div className="mt-4 text-left p-4 bg-gray-50/80 border border-gray-200/80 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-y-4">
                    {estimatedTime && (
                        <div className="flex items-start gap-3 text-sm text-gray-700">
                            <ClockIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                            <div>
                                <p className="font-semibold">Tempo Estimado</p>
                                <p className="text-gray-600">{estimatedTime}</p>
                            </div>
                        </div>
                    )}
                    {precisionPotential !== null && (
                        <div className="flex items-start gap-3 text-sm text-gray-700">
                           <TargetIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                           <div className="w-full">
                               <div className="flex justify-between items-baseline mb-1">
                                   <p className="font-semibold">Potencial de Precisão</p>
                                   <p className="font-bold text-lg text-gray-800">{precisionPotential}<span className="text-sm">%</span></p>
                               </div>
                               <div className="w-full bg-gray-200 rounded-full h-2">
                                   <div className="bg-gradient-to-r from-[#24a9c5] to-[#1e8a9f] h-2 rounded-full" style={{ width: `${precisionPotential}%` }}></div>
                               </div>
                           </div>
                       </div>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-200">
                    <strong>Nota:</strong> As estimativas são calculadas com base nas características técnicas do ficheiro. A precisão final depende da clareza do áudio, ruído de fundo e sotaques.
                </p>
            </div>
          )}

          {error && <div className="text-center text-red-800 bg-red-100 p-3 my-4 rounded-lg border border-red-200">{error}</div>}

          {processStage !== 'idle' && (
            <div className="mt-6">
              {audioFile && (
                <div className="mb-6 text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-semibold text-gray-600">A processar o ficheiro:</p>
                    <p className="text-lg font-bold text-gray-800 truncate px-4">{audioFile.name}</p>
                    <div className="mt-2 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-gray-500">
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
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TranscriptDisplay 
                    title="Transcrição Bruta e Literal"
                    text={rawTranscript}
                    isLoading={processStage === 'transcribing'}
                    isComplete={processStage !== 'transcribing' && rawTranscript.length > 0}
                />
                <TranscriptDisplay 
                    title="Documento Limpo e Profissional"
                    text={cleanedTranscript}
                    isLoading={processStage === 'cleaning'}
                    isComplete={processStage === 'completed' && cleanedTranscript.length > 0}
                    placeholder={processStage === 'cleaning' || processStage === 'completed' ? "A aguardar pela otimização..." : "O resultado aparecerá aqui."}
                    renderAsMarkdown={true}
                />
            </div>
        )}
      </main>
      <footer className="text-center py-6 text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} LONGANI.</p>
      </footer>
      {showFeedbackPopup && <FeedbackPopup onSubmit={handleFeedbackSubmit} onClose={handleFeedbackClose} />}
    </div>
  );
};

export default App;

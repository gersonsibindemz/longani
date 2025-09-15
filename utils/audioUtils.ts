export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('audio/')) {
      return reject(new Error('Ficheiro inválido. Por favor, selecione um ficheiro de áudio.'));
    }
    const audio = new Audio(URL.createObjectURL(file));
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(audio.src); // Clean up the object URL
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error('Não foi possível ler os metadados do ficheiro de áudio.'));
    });
  });
};

const formatTime = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return 'cálculo indisponível';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (minutes > 0 && seconds > 0) {
    return `~${minutes} min e ${seconds} seg`;
  }
  if (minutes > 0) {
    return `~${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
  return `~${seconds} segundos`;
};

// Heuristic: processing is ~4x faster than realtime + 5s buffer
export const estimateProcessingTime = (durationInSeconds: number): string => {
  const estimatedSeconds = (durationInSeconds / 4) + 5;
  return formatTime(estimatedSeconds);
};

export const estimatePrecisionPotential = (fileName: string): number => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'wav':
        case 'flac':
            return 95; // Lossless formats
        case 'm4a':
        case 'aac':
            return 85; // High-quality compressed
        case 'mp3':
        case 'ogg':
        case 'webm':
             return 75; // Standard compressed
        default:
            return 65; // Unknown/other
    }
};

/**
 * Calculates a dynamic precision score based on the transcription content.
 * The score starts with an initial potential and decreases based on the
 * number of "[inaudible]" markers found in the text.
 * @param transcript The raw transcript text generated so far.
 * @param initialPotential The starting precision score, usually based on file type.
 * @returns A new precision score between a min value (e.g., 40) and the initial potential.
 */
export const calculateDynamicPrecision = (
    transcript: string,
    initialPotential: number
): number => {
    if (!transcript.trim()) {
        return initialPotential;
    }

    const words = transcript.split(/\s+/);
    if (words.length < 10) { // Don't start penalizing until there's some text
        return initialPotential;
    }

    const inaudibleCount = (transcript.match(/\[inaudible\]/gi) || []).length;
    
    // Each "[inaudible]" marker applies a fixed penalty.
    const penaltyPerInaudible = 3;
    const totalPenalty = inaudibleCount * penaltyPerInaudible;

    // Ensure the score doesn't drop below a reasonable minimum.
    const MIN_SCORE = 40;
    const newScore = Math.max(MIN_SCORE, initialPotential - totalPenalty);
    
    return Math.round(newScore);
};

/**
 * Maps known technical error messages to user-friendly Portuguese messages.
 * This function also logs the original error to the console for debugging purposes,
 * helping developers to identify issues while providing clear, actionable feedback to users.
 *
 * @param error The error object or string to be processed.
 * @param transcriptionId An optional unique ID for the job to aid in debugging.
 * @returns A user-friendly error message string in Portuguese.
 */
export const getFriendlyErrorMessage = (error: unknown, transcriptionId?: string): string => {
  const logPrefix = transcriptionId ? `[Error TID: ${transcriptionId}]` : '[Error]';
  // Log the original error for debugging.
  console.error(`${logPrefix} An error was caught and processed for the user:`, error);

  // Default message for truly unknown errors.
  let friendlyMessage = 'Ocorreu um erro inesperado. Por favor, tente novamente ou contacte o suporte se o problema persistir.';

  let technicalMessage = '';
  if (error instanceof Error) {
    technicalMessage = error.message.toUpperCase();
  } else if (typeof error === 'string') {
    technicalMessage = error.toUpperCase();
  }

  // --- Gemini API / Network Errors ---
  if (technicalMessage.includes('API_KEY_INVALID') || technicalMessage.includes('API KEY')) {
    friendlyMessage = 'A chave de acesso ao serviço de IA é inválida ou está em falta. Por favor, contacte o suporte técnico para resolver este problema de configuração.';
    // Provide a more specific log for developers.
    console.error(`${logPrefix} Developer Info: The Gemini API key is missing, invalid, or expired.`);
  } else if (technicalMessage.includes('QUOTA')) {
    friendlyMessage = 'O limite diário de utilizações gratuitas foi atingido. Sendo uma aplicação gratuita, utilizamos um plano com uma quota diária partilhada por todos os utilizadores. O serviço será restaurado amanhã. Por favor, tente novamente mais tarde.';
  } else if (technicalMessage.includes('SAFETY')) {
    friendlyMessage = 'O conteúdo do áudio não pôde ser processado devido às políticas de segurança. Isto pode ocorrer com temas sensíveis ou linguagem inapropriada.';
  } else if (technicalMessage.includes('NETWORK') || technicalMessage.includes('FETCH') || technicalMessage.includes('FAILED TO FETCH') || technicalMessage.includes('OFFLINE')) {
    friendlyMessage = 'Falha de comunicação com o servidor. Verifique a sua ligação à internet e tente novamente. Se estiver a usar uma VPN, tente desativá-la temporariamente.';
  } else if (technicalMessage.includes('INVALID_ARGUMENT')) {
     friendlyMessage = 'Ocorreu um erro ao processar o ficheiro. Pode estar num formato não suportado, ser inválido ou estar corrompido. Tente usar um ficheiro de áudio diferente.';
  } else if (technicalMessage.includes('MODEL_NOT_FOUND')) {
      friendlyMessage = 'O modelo de IA configurado não foi encontrado. Por favor, contacte o suporte técnico para corrigir a configuração da aplicação.';
  } else if (technicalMessage.includes('DEADLINE_EXCEEDED') || technicalMessage.includes('TIMEOUT')) {
      friendlyMessage = 'O pedido demorou demasiado tempo a responder e foi cancelado. Isto pode dever-se a uma ligação lenta ou a um ficheiro muito grande. Por favor, tente novamente.';
  }
  
  // --- Local File Handling Errors (from our own code) ---
  else if (technicalMessage.includes('NÃO FOI POSSÍVEL LER O FICHEIRO')) {
    // This message is already friendly, but we centralize it for consistency.
    friendlyMessage = 'Não foi possível ler o ficheiro selecionado. Pode estar corrompido ou o navegador pode não ter permissão para o aceder.';
  } else if (technicalMessage.includes('FALHA AO CONVERTER O FICHEIRO PARA BASE64')) {
    friendlyMessage = 'Ocorreu um erro ao preparar o ficheiro para envio. Por favor, tente usar um ficheiro diferente ou converter o áudio para um formato comum como MP3 ou WAV.';
  }

  // Log the final message that will be displayed to the user.
  console.log(`${logPrefix} [User-Facing Error]: ${friendlyMessage}`);
  
  return friendlyMessage;
};
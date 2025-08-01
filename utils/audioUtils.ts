
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

import React, { useState } from 'react';
import { StarIcon, ThumbsUpIcon, ThumbsDownIcon, CloseIcon } from './Icons';
import { Loader } from './Loader';
import { getFriendlyErrorMessage } from '../utils/audioUtils';

interface FeedbackPopupProps {
  onSubmit: () => void;
  onClose: () => void;
}

export const FeedbackPopup: React.FC<FeedbackPopupProps> = ({ onSubmit, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Por favor, selecione uma avaliação de estrelas.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    const deviceId = localStorage.getItem('longani_deviceId');
    const feedbackData = {
      _subject: "User Feedback - Longani Web App",
      timestamp: new Date().toISOString(),
      deviceId,
      rating,
      liked: liked === null ? 'N/A' : (liked ? 'Liked' : 'Disliked'),
      comment,
    };

    try {
      // Using FormSubmit.co to forward the form to an email address.
      // This is a free service that handles form submissions for static sites.
      // The user will need to confirm their email once at formsubmit.co/gersonsibinde64@gmail.com
      const response = await fetch('https://formsubmit.co/gersonsibinde64@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(feedbackData)
      });
      if (response.ok) {
        onSubmit();
      } else {
        throw new Error('A submissão do feedback falhou. Por favor, tente novamente.');
      }
    } catch (err) {
      const friendlyMessage = getFriendlyErrorMessage(err);
      setError(`O envio do feedback falhou. ${friendlyMessage}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 transform transition-all animate-in fade-in-0 zoom-in-95">
        <button onClick={onClose} aria-label="Fechar" className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
          <CloseIcon />
        </button>

        <form onSubmit={handleSubmission} noValidate>
          <h2 id="feedback-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 text-center mb-2">O seu feedback é importante</h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-6">Ajude-nos a melhorar a sua experiência.</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 text-center">Avalie a sua experiência</label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Avaliação de ${star} estrelas`}
                    className="focus:outline-none"
                  >
                    <StarIcon
                      className={`w-8 h-8 transition-colors duration-200 ${
                        (hoverRating || rating) >= star
                          ? 'text-yellow-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 text-center">Recomendaria a um amigo?</label>
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => setLiked(true)}
                  aria-pressed={liked === true}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                    liked === true
                      ? 'bg-green-100 border-green-400 text-green-700 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300 dark:hover:border-green-500'
                  }`}
                >
                  <ThumbsUpIcon className="w-5 h-5" />
                  <span>Sim</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLiked(false)}
                   aria-pressed={liked === false}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                    liked === false
                      ? 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-700 dark:text-red-300'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-red-400 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300 dark:hover:border-red-500'
                  }`}
                >
                  <ThumbsDownIcon className="w-5 h-5" />
                  <span>Não</span>
                </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="comment" className="sr-only">Comentário</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Deixe um comentário (opcional)..."
                rows={3}
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#24a9c5] focus:border-[#24a9c5] transition dark:placeholder-gray-400"
              ></textarea>
            </div>
          </div>
          
          {error && <p className="text-red-600 dark:text-red-400 text-sm text-center mt-4">{error}</p>}

          <div className="mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-[#24a9c5] text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-[#1e8a9f] disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-5 h-5" />
                  <span>A enviar...</span>
                </>
              ) : (
                'Enviar Feedback'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
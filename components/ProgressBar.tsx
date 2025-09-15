
import React from 'react';
import { CheckIcon } from './Icons';
import { Loader } from './Loader';

type ProcessStage = 'idle' | 'transcribing' | 'cleaning' | 'completed';

interface ProgressBarProps {
  stage: ProcessStage;
}

const steps = [
  { id: 'idle', label: 'Carregar' },
  { id: 'transcribing', label: 'A Transcrever' },
  { id: 'cleaning', label: 'A Otimizar' },
  { id: 'completed', label: 'Concluído' }
];

export const ProgressBar: React.FC<ProgressBarProps> = ({ stage }) => {
  const currentStepIndex = steps.findIndex(step => step.id === stage);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStepIndex > index || stage === 'completed';
          const isCurrent = currentStepIndex === index;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center text-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                    ${isCompleted ? 'bg-[#24a9c5] border-[#24a9c5] text-white' : ''}
                    ${isCurrent && !isCompleted ? 'bg-white border-[#24a9c5] dark:bg-gray-800' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-6 h-6" />
                  ) : isCurrent && (stage === 'transcribing' || stage === 'cleaning') ? (
                    <Loader className="w-6 h-6 text-[#24a9c5]" />
                  ) : (
                    <span className={`font-bold ${isCurrent ? 'text-[#24a9c5]' : 'text-gray-500 dark:text-gray-400'}`}>{index + 1}</span>
                  )}
                </div>
                <p
                  className={`mt-2 text-xs font-semibold transition-colors duration-300
                    ${isCompleted || isCurrent ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
                  `}
                >
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                 <div className={`flex-1 h-1 mx-2 transition-colors duration-500 rounded
                    ${isCompleted || isCurrent ? 'bg-[#24a9c5]' : 'bg-gray-300 dark:bg-gray-700'}
                 `}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

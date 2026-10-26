import React from 'react';

interface BadgeIconProps {
  badgeId: string;
  primaryColor: string;
  secondaryColor: string;
  className?: string;
  size?: number;
}

export const BADGE_OPTIONS = [
  { id: 'shield', name: 'Royal Shield' },
  { id: 'circle', name: 'Golden Crest' },
  { id: 'star', name: 'Victory Star' },
  { id: 'phoenix', name: 'Thunder Bolt' },
  { id: 'diamond', name: 'Diamond Apex' },
];

export const BadgeIcon: React.FC<BadgeIconProps> = ({
  badgeId,
  primaryColor,
  secondaryColor,
  className = '',
  size = 40,
}) => {
  const p = primaryColor || '#10B981';
  const s = secondaryColor || '#0F172A';

  switch (badgeId) {
    case 'circle':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="46" fill={p} stroke={s} strokeWidth="6" />
          <circle cx="50" cy="50" r="34" fill={s} />
          <circle cx="50" cy="50" r="16" fill={p} />
          <polygon points="50,22 58,40 78,40 62,52 68,72 50,60 32,72 38,52 22,40 42,40" fill="#F8FAFC" />
        </svg>
      );

    case 'star':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="50,6 64,36 96,36 70,56 80,88 50,68 20,88 30,56 4,36 36,36"
            fill={p}
            stroke={s}
            strokeWidth="5"
          />
          <circle cx="50" cy="50" r="14" fill={s} />
          <polygon points="50,42 54,48 60,48 55,52 57,58 50,54 43,58 45,52 40,48 46,48" fill="#F8FAFC" />
        </svg>
      );

    case 'phoenix':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 4 L88 28 L88 64 L50 96 L12 64 L12 28 Z"
            fill={s}
            stroke={p}
            strokeWidth="6"
          />
          {/* Lightning bolt inside */}
          <polygon
            points="54,18 32,50 48,50 42,82 68,44 52,44"
            fill={p}
          />
        </svg>
      );

    case 'diamond':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="50,8 92,50 50,92 8,50"
            fill={p}
            stroke={s}
            strokeWidth="6"
          />
          <polygon
            points="50,22 78,50 50,78 22,50"
            fill={s}
          />
          <circle cx="50" cy="50" r="10" fill="#F8FAFC" />
        </svg>
      );

    case 'shield':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 6 C74 6 92 14 92 36 C92 68 68 88 50 94 C32 88 8 68 8 36 C8 14 26 6 50 6 Z"
            fill={p}
            stroke={s}
            strokeWidth="6"
          />
          <path
            d="M50 18 C66 18 80 24 80 40 C80 62 62 76 50 82 C38 76 20 62 20 40 C20 24 34 18 50 18 Z"
            fill={s}
          />
          {/* Football icon in center */}
          <circle cx="50" cy="48" r="14" fill="#F8FAFC" />
          <polygon points="50,42 54,46 52,52 48,52 46,46" fill={s} />
        </svg>
      );
  }
};

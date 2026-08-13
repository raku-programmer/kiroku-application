import type { ComponentType, SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;
export type IconComponent = ComponentType<IconProps>;

const ICON_SIZE = 20;

const baseProps = (props: IconProps): IconProps => ({
  width: ICON_SIZE,
  height: ICON_SIZE,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  ...props,
});

export const EntryIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    <path d="M14 4v6h6" />
    <path d="M9 14h6M12 11v6" />
  </svg>
);

export const ListIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
    <circle cx="2.5" cy="6" r="0.6" fill="currentColor" />
    <circle cx="2.5" cy="12" r="0.6" fill="currentColor" />
    <circle cx="2.5" cy="18" r="0.6" fill="currentColor" />
  </svg>
);

export const SettingsIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
  </svg>
);

export const MenuIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const DownloadIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 20h16" />
  </svg>
);

export const UploadIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M12 15V3" />
    <path d="m7 8 5-5 5 5" />
    <path d="M4 20h16" />
  </svg>
);

export const PlusIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const TrashIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    <path d="M9 7V4h6v3" />
  </svg>
);

export const EditIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);

/** 経費照会（内容を見る） */
export const EyeIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

export const CopyIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);

export const PaperclipIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 17.5a2 2 0 0 1-3-3l8-8" />
  </svg>
);

/** クリップボードから貼り付け */
export const ClipboardIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M9 4H7a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2" />
    <rect x="9" y="2.5" width="6" height="3.5" rx="1" />
  </svg>
);

export const FolderIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" />
  </svg>
);

export const RestoreIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);

export const CloseIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const CheckIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="m5 13 4 4L19 7" />
  </svg>
);

/** 前の領収書へ */
export const ChevronLeftIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

/** 次の領収書へ */
export const ChevronRightIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const ChevronUpIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="m6 15 6-6 6 6" />
  </svg>
);

export const ChevronDownIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const SparkleIcon: IconComponent = (props) => (
  <svg {...baseProps(props)}>
    <path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7l-1.6-5.5L5 10.6 10.4 9 12 3.5Z" />
  </svg>
);

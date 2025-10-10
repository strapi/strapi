import * as React from 'react';

import { Flex, FlexProps } from '@strapi/design-system';
import * as Icons from '@strapi/icons';
import * as Symbols from '@strapi/icons/symbols';

import type { Struct } from '@strapi/types';

interface ComponentIconProps extends FlexProps {
  showBackground?: boolean;
  icon?: Struct.ContentTypeSchemaInfo['icon'];
}

const ComponentIcon = ({
  showBackground = true,
  icon = 'dashboard',
  ...props
}: ComponentIconProps) => {
  const Icon = COMPONENT_ICONS[icon as keyof typeof COMPONENT_ICONS] || COMPONENT_ICONS.dashboard;

  return (
    <Flex
      alignItems="center"
      background={showBackground ? 'neutral200' : undefined}
      justifyContent="center"
      height={8}
      width={8}
      color="neutral600"
      borderRadius={showBackground ? '50%' : 0}
      {...props}
    >
      <Icon height="2rem" width="2rem" />
    </Flex>
  );
};

const COMPONENT_ICONS: Record<string, React.ComponentType<any>> = {
  alien: Icons.Alien,
  apps: Icons.GridNine,
  archive: Icons.Archive,
  arrowDown: Icons.ArrowDown,
  arrowLeft: Icons.ArrowLeft,
  arrowRight: Icons.ArrowRight,
  arrowUp: Icons.ArrowUp,
  attachment: Icons.Paperclip,
  bell: Icons.Bell,
  bold: Icons.Bold,
  book: Icons.Book,
  briefcase: Icons.Briefcase,
  brush: Icons.PaintBrush,
  bulletList: Icons.BulletList,
  calendar: Icons.Calendar,
  car: Icons.Car,
  cast: Icons.Cast,
  chartBubble: Icons.ChartBubble,
  chartCircle: Icons.ChartCircle,
  chartPie: Icons.ChartPie,
  check: Icons.Check,
  clock: Icons.Clock,
  cloud: Icons.Cloud,
  code: Icons.Code,
  cog: Icons.Cog,
  collapse: Icons.Collapse,
  command: Icons.Command,
  connector: Icons.Faders,
  crop: Icons.Crop,
  crown: Icons.Crown,
  cup: Icons.Coffee,
  cursor: Icons.Cursor,
  dashboard: Icons.SquaresFour,
  database: Icons.Database,
  discuss: Icons.Discuss,
  doctor: Icons.Stethoscope,
  earth: Icons.Earth,
  emotionHappy: Icons.EmotionHappy,
  emotionUnhappy: Icons.EmotionUnhappy,
  envelop: Icons.Mail,
  exit: Icons.SignOut,
  expand: Icons.Expand,
  eye: Icons.Eye,
  feather: Icons.Feather,
  file: Icons.File,
  fileError: Icons.FileError,
  filePdf: Icons.FilePdf,
  filter: Icons.Filter,
  folder: Icons.Folder,
  gate: Icons.CastleTurret,
  gift: Icons.Gift,
  globe: Icons.Globe,
  grid: Icons.GridFour,
  handHeart: Icons.HandHeart,
  hashtag: Icons.Hashtag,
  headphone: Icons.Headphones,
  heart: Icons.Heart,
  house: Icons.House,
  information: Icons.Information,
  italic: Icons.Italic,
  key: Icons.Key,
  landscape: Icons.Images,
  layer: Icons.ListPlus,
  layout: Icons.Layout,
  lightbulb: Icons.Lightbulb,
  link: Icons.Link,
  lock: Icons.Lock,
  magic: Icons.Magic,
  manyToMany: Icons.ManyToMany,
  manyToOne: Icons.ManyToOne,
  manyWays: Icons.ManyWays,
  medium: Symbols.Medium,
  message: Icons.Message,
  microphone: Icons.Microphone,
  monitor: Icons.Monitor,
  moon: Icons.Moon,
  music: Icons.MusicNotes,
  oneToMany: Icons.OneToMany,
  oneToOne: Icons.OneToOne,
  oneWay: Icons.OneWay,
  paint: Icons.PaintBrush,
  paintBrush: Icons.PaintBrush,
  paperPlane: Icons.PaperPlane,
  pencil: Icons.Pencil,
  phone: Icons.Phone,
  picture: Icons.Image,
  pin: Icons.Pin,
  pinMap: Icons.PinMap,
  plane: Icons.Plane,
  play: Icons.Play,
  plus: Icons.Plus,
  priceTag: Icons.PriceTag,
  puzzle: Icons.PuzzlePiece,
  question: Icons.Question,
  quote: Icons.Quotes,
  refresh: Icons.ArrowClockwise,
  restaurant: Icons.Restaurant,
  rocket: Icons.Rocket,
  rotate: Icons.ArrowsCounterClockwise,
  scissors: Icons.Scissors,
  search: Icons.Search,
  seed: Icons.Plant,
  server: Icons.Server,
  shield: Icons.Shield,
  shirt: Icons.Shirt,
  shoppingCart: Icons.ShoppingCart,
  slideshow: Icons.PresentationChart,
  stack: Icons.Stack,
  star: Icons.Star,
  store: Icons.Store,
  strikeThrough: Icons.StrikeThrough,
  sun: Icons.Sun,
  television: Icons.Television,
  thumbDown: Icons.ThumbDown,
  thumbUp: Icons.ThumbUp,
  train: Icons.Train,
  twitter: Symbols.X,
  typhoon: Icons.Typhoon,
  underline: Icons.Underline,
  user: Icons.User,
  volumeMute: Icons.VolumeMute,
  volumeUp: Icons.VolumeUp,
  walk: Icons.Walk,
  wheelchair: Icons.Wheelchair,
  write: Icons.Feather,
};

export { ComponentIcon, COMPONENT_ICONS };
export type { ComponentIconProps };

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Clock3,
  Cloud,
  Copy,
  Github,
  ImageIcon,
  KeyRound,
  Mail,
  Minimize2,
  Play,
  Plus,
  Rocket,
  Save,
  Share2,
  Star,
  TerminalSquare,
  TextCursorInput,
  Video,
  WandSparkles,
  Workflow,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';

const githubUrl = 'https://github.com/ZeroLu/open-canvas';

type ProviderLogo = 'cyberbara' | 'gemini' | 'openai' | 'openrouter' | 'replicate';

const providers: Array<{
  logo: ProviderLogo;
  name: string;
  tone: string;
}> = [
  { name: 'OpenAI', logo: 'openai', tone: 'text-white' },
  { name: 'Gemini', logo: 'gemini', tone: 'text-[#5ea1ff]' },
  { name: 'OpenRouter', logo: 'openrouter', tone: 'text-[#a78bfa]' },
  { name: 'Replicate', logo: 'replicate', tone: 'text-white' },
  { name: 'Cyberbara', logo: 'cyberbara', tone: 'text-[#65d6ad]' },
];

const canvasPreviewImages = {
  base: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=720&q=85',
  edit: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=720&q=85',
  video: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=720&q=85',
};

const steps = [
  {
    icon: KeyRound,
    title: '1. Bring your own key',
    body: 'Connect OpenAI, Gemini, OpenRouter, Replicate, or Cyberbara. You keep provider access and billing in your own account.',
    tone: 'text-[#a78bfa] border-[#a78bfa]/25 bg-[#a78bfa]/10',
  },
  {
    icon: Workflow,
    title: '2. Add nodes',
    body: 'Place text, image, video, and generation nodes on a spatial canvas so your creative workflow stays visible.',
    tone: 'text-[#5ea1ff] border-[#5ea1ff]/25 bg-[#5ea1ff]/10',
  },
  {
    icon: WandSparkles,
    title: '3. Connect and generate',
    body: 'Turn one output into the next input. Compose multi-model image and video pipelines without locking work into one platform.',
    tone: 'text-[#f472b6] border-[#f472b6]/25 bg-[#f472b6]/10',
  },
];

const faqs = [
  {
    question: 'What is BYOK?',
    answer:
      'BYOK means Bring Your Own Key. Instead of buying platform credits, you paste your provider API keys and pay the provider directly for the generations you run.',
  },
  {
    question: 'Is Open Canvas free?',
    answer:
      'Yes. The product is open source and the hosted app is free to use. Your only generation cost is whatever your selected AI provider charges for API usage.',
  },
  {
    question: 'Can I self-host it?',
    answer:
      'Yes. You can run Open Canvas locally or deploy your own copy. Canvas JSON import and export keeps your work portable.',
  },
  {
    question: 'Are my API keys safe in the hosted app?',
    answer:
      'Your keys are configured in your browser and used for provider requests. For the strictest control, run the same open-source app locally or on your own infrastructure.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Open Canvas',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  url: 'https://open-canvas.cyberbara.com',
  description:
    'A free open-source BYOK AI canvas for building image, video, audio, and text workflows with your own provider keys.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

function ProviderMarquee() {
  const repeated = [...providers, ...providers];

  return (
    <section
      id="providers"
      className="relative z-10 overflow-hidden border-y border-white/8 bg-[#0b0b0f]/92 py-8"
    >
      <div className="mx-auto mb-6 max-w-7xl px-5 text-center md:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">
          Connect any API. Zero platform lock-in.
        </p>
      </div>
      <div className="relative flex overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-[linear-gradient(90deg,#0b0b0f,rgba(11,11,15,0))] md:w-36" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-[linear-gradient(270deg,#0b0b0f,rgba(11,11,15,0))] md:w-36" />
        <div className="landing-marquee flex w-max items-center gap-14 px-7 hover:[animation-play-state:paused]">
          {repeated.map((provider, index) => {
            return (
              <div
                key={`${provider.name}-${index}`}
                className="flex min-w-max items-center gap-3 text-2xl font-bold text-white/48"
              >
                <BrandLogo logo={provider.logo} className={`size-8 ${provider.tone}`} />
                {provider.name}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BrandLogo({
  logo,
  className,
}: {
  logo: ProviderLogo;
  className?: string;
}) {
  if (logo === 'cyberbara') {
    return (
      <div className="flex size-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#8b5cf6,#2563eb)] shadow-[0_0_15px_rgba(139,92,246,0.42)]">
        <Workflow className="size-4 text-white" />
      </div>
    );
  }

  const paths: Record<Exclude<ProviderLogo, 'cyberbara'>, string> = {
    gemini:
      'M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z',
    openai:
      'M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z',
    openrouter:
      'M16.804 1.957l7.22 4.105v.087L16.73 10.21l.017-2.117-.821-.03c-1.059-.028-1.611.002-2.268.11-1.064.175-2.038.577-3.147 1.352L8.345 11.03c-.284.195-.495.336-.68.455l-.515.322-.397.234.385.23.53.338c.476.314 1.17.796 2.701 1.866 1.11.775 2.083 1.177 3.147 1.352l.3.045c.694.091 1.375.094 2.825.033l.022-2.159 7.22 4.105v.087L16.589 22l.014-1.862-.635.022c-1.386.042-2.137.002-3.138-.162-1.694-.28-3.26-.926-4.881-2.059l-2.158-1.5a21.997 21.997 0 00-.755-.498l-.467-.28a55.927 55.927 0 00-.76-.43C2.908 14.73.563 14.116 0 14.116V9.888l.14.004c.564-.007 2.91-.622 3.809-1.124l1.016-.58.438-.274c.428-.28 1.072-.726 2.686-1.853 1.621-1.133 3.186-1.78 4.881-2.059 1.152-.19 1.974-.213 3.814-.138l.02-1.907z',
    replicate:
      'M22 10.552v2.26h-7.932V22H11.54V10.552H22zM22 2v2.264H4.528V22H2V2h20zm0 4.276V8.54H9.296V22H6.768V6.276H22z',
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      fillRule="evenodd"
      viewBox="0 0 24 24"
    >
      <path d={paths[logo]} />
    </svg>
  );
}

function CanvasPreview() {
  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-2xl shadow-[#4c1d95]/25">
      <div className="absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-white/8 bg-[#111111]/88 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden items-center gap-2 text-sm font-medium text-white/52 sm:flex">
            <ArrowLeft className="size-4" />
            Back
          </div>
          <div className="rounded-md border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/62">
            Canvas Studio
          </div>
          <span className="hidden truncate text-sm font-semibold text-white md:block">
            Group Photo FPV Shot Template
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/52">
          <Clock3 className="hidden size-4 sm:block" />
          <span className="hidden sm:inline">2927</span>
          <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/[0.06] px-3 py-1.5 md:flex">
            <Save className="size-3.5" />
            Saving
          </div>
          <button className="flex items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-white transition hover:bg-white/15">
            <Share2 className="size-3.5" />
            Share
          </button>
        </div>
      </div>

      <div className="absolute left-4 top-20 z-20 flex w-12 flex-col items-center gap-4 rounded-xl border border-white/8 bg-[#161616] py-2 shadow-lg">
        <div className="flex size-8 items-center justify-center rounded-full bg-white text-black">
          <Plus className="size-4" />
        </div>
        <div className="h-px w-full bg-white/8" />
        <TextCursorInput className="size-5 text-white/46" />
        <Copy className="size-5 text-white/46" />
        <ImageIcon className="size-5 text-white/46" />
        <Video className="size-5 text-white/46" />
      </div>

      <div className="absolute bottom-4 left-4 z-20 hidden w-40 rounded-xl border border-white/8 bg-[#161616] p-3 shadow-lg md:block">
        <div className="relative mb-2 h-20 overflow-hidden rounded border border-white/8 bg-[#222]">
          <div className="absolute bottom-2 left-2 flex gap-1">
            <div className="h-3 w-4 rounded-sm bg-[#8b5cf6]" />
            <div className="h-3 w-4 rounded-sm bg-[#5ea1ff]" />
            <div className="h-3 w-4 rounded-sm bg-[#f472b6]" />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-white/46">
          <Minimize2 className="size-3.5" />
          <span>101%</span>
        </div>
      </div>

      <div className="landing-canvas-grid h-[560px] overflow-x-auto overflow-y-hidden pt-20 md:h-[680px]">
        <div className="relative flex h-full min-w-[980px] items-center justify-center gap-16 px-24 pb-10">
          <svg
            className="absolute inset-0 z-0 h-full w-full min-w-[980px]"
            fill="none"
            viewBox="0 0 980 560"
          >
            <path d="M310 278 C360 278 360 278 410 278" stroke="#444" strokeWidth="2" />
            <circle cx="310" cy="278" r="4" fill="#111" stroke="#888" strokeWidth="2" />
            <circle cx="410" cy="278" r="4" fill="#111" stroke="#888" strokeWidth="2" />
            <path d="M650 278 C700 278 700 278 750 278" stroke="#444" strokeWidth="2" />
            <circle cx="650" cy="278" r="4" fill="#111" stroke="#888" strokeWidth="2" />
            <circle cx="750" cy="278" r="4" fill="#111" stroke="#888" strokeWidth="2" />
          </svg>

          <CanvasNode title="Image Node" icon={ImageIcon}>
            <Image
              src={canvasPreviewImages.base}
              alt="Fashion portrait source image"
              fill
              priority
              className="object-cover"
              sizes="288px"
            />
          </CanvasNode>

          <CanvasNode title="Image Node" icon={ImageIcon} className="-translate-y-2">
            <Image
              src={canvasPreviewImages.edit}
              alt="Stylized editorial image variation"
              fill
              className="object-cover"
              sizes="288px"
            />
          </CanvasNode>

          <CanvasNode title="Video Node" icon={Video} active>
            <Image
              src={canvasPreviewImages.video}
              alt="Generated cinematic video preview"
              fill
              className="object-cover opacity-90 transition duration-700 group-hover:scale-105"
              sizes="288px"
            />
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20">
              <div className="flex size-12 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur transition hover:bg-white/30">
                <Play className="ml-0.5 size-5 fill-white text-white" />
              </div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between rounded bg-black/55 px-2 py-1 text-[10px] text-white backdrop-blur">
              <span>0:00 / 0:15</span>
              <span className="tracking-[0.2em]">•••</span>
            </div>
          </CanvasNode>
        </div>
      </div>
    </div>
  );
}

function CanvasNode({
  title,
  icon: Icon,
  active = false,
  className = '',
  children,
}: {
  title: string;
  icon: typeof ImageIcon;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`group z-10 flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-xl ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/8 bg-[#1f1f1f] p-3">
        <div className="flex size-6 items-center justify-center rounded bg-white/[0.06]">
          <Icon className={`size-3.5 ${active ? 'text-[#a78bfa]' : 'text-white/46'}`} />
        </div>
        <span className={`text-sm font-medium ${active ? 'text-white' : 'text-white/75'}`}>
          {title}
        </span>
      </div>
      <div className="p-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
          {children}
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#0b0b0f] text-white selection:bg-[#8b5cf6] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-[#0b0b0f]/78 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#8b5cf6,#2563eb)] shadow-lg shadow-[#8b5cf6]/25">
              <Workflow className="size-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight sm:text-xl">
              Open Canvas<span className="text-[#a78bfa]">.</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-white/52 transition hover:text-white">
              How it works
            </a>
            <a href="#providers" className="text-sm font-medium text-white/52 transition hover:text-white">
              Providers
            </a>
            <a href="#quick-start" className="text-sm font-medium text-white/52 transition hover:text-white">
              Quick start
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-white/52 transition hover:text-white"
            >
              <Github className="size-4" />
              GitHub
            </a>
          </div>

          <Link
            href="/canvas"
            className="landing-glow-button inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-3 py-2.5 text-sm font-bold text-[#0b0b0f] transition hover:scale-[1.03] sm:px-4 md:px-6"
          >
            <span className="hidden sm:inline">Launch app</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </nav>

      <section className="relative z-10 overflow-hidden pb-16 pt-32 md:pb-24 md:pt-40">
        <div className="landing-hero-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="mx-auto max-w-7xl px-5 text-center md:px-6">
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="landing-fade-up inline-flex max-w-[calc(100vw-40px)] items-center gap-2 rounded-full border border-[#8b5cf6]/30 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#c4b5fd] backdrop-blur transition hover:bg-white/[0.06] sm:px-4 sm:tracking-[0.16em]"
          >
            <span className="size-2 rounded-full bg-[#8b5cf6] shadow-[0_0_10px_#8b5cf6]" />
            <span className="truncate sm:hidden">Open-source alternative</span>
            <span className="hidden sm:inline">100% open-source alternative</span>
            <ArrowRight className="size-3.5" />
          </a>

          <h1 className="landing-fade-up landing-delay-100 mx-auto mt-8 max-w-[22rem] text-4xl font-extrabold leading-[1.08] tracking-normal sm:max-w-5xl sm:text-5xl md:text-7xl">
            The infinite AI canvas,
            <br className="hidden md:block" />
            <span className="bg-[linear-gradient(135deg,#fff,#a78bfa)] bg-clip-text text-transparent">
              fully unlocked.
            </span>
          </h1>

          <p className="landing-fade-up landing-delay-200 mx-auto mt-6 max-w-[21rem] text-base leading-8 text-white/62 sm:max-w-3xl md:text-xl">
            Break free from locked-in ecosystems like TapNow, LibTV, and Higgsfield.
            Bring your own key and generate, manipulate, and direct images and videos
            on a spatial workspace.
          </p>

          <div className="landing-fade-up landing-delay-300 mx-auto mb-16 mt-10 flex max-w-[21rem] flex-col justify-center gap-4 sm:max-w-none sm:flex-row md:mb-20">
            <a
              href="#quick-start"
              className="landing-glow-button inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-6 py-4 text-base font-bold text-white shadow-[0_0_30px_rgba(124,58,237,0.35)] transition hover:bg-[#8b5cf6] sm:w-auto sm:px-8 sm:text-lg"
            >
              Start creating
              <Rocket className="size-5" />
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10 sm:w-auto sm:px-8 sm:text-lg"
            >
              <Star className="size-5 fill-[#facc15] text-[#facc15]" />
              Star on GitHub
            </a>
          </div>

          <div className="landing-fade-up landing-delay-300">
            <CanvasPreview />
          </div>
        </div>
      </section>

      <ProviderMarquee />

      <section id="how-it-works" className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-3xl font-bold md:text-5xl">How Open Canvas works</h2>
            <p className="mt-5 text-lg leading-8 text-white/58">
              A visual workspace built for multi-modal AI. No locked credit system,
              no hidden workflow format, no single-provider ceiling.
            </p>
          </div>

          <div className="relative grid gap-6 md:grid-cols-3">
            <div className="absolute left-20 right-20 top-1/2 hidden h-px bg-[linear-gradient(90deg,transparent,rgba(139,92,246,0.34),transparent)] md:block" />
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="relative z-10 rounded-2xl border border-white/8 bg-[#0d0d13] p-7 transition hover:border-white/18"
                >
                  <div className={`mb-6 flex size-16 items-center justify-center rounded-2xl border ${step.tone}`}>
                    <Icon className="size-8" />
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/58">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="quick-start"
        className="relative z-10 border-t border-white/8 bg-[linear-gradient(180deg,rgba(28,28,38,0.36),#0b0b0f)] py-24"
      >
        <div className="mx-auto max-w-7xl px-5 md:px-6">
          <div className="mb-14 max-w-3xl">
            <h2 className="text-3xl font-bold md:text-5xl">Quick start</h2>
            <p className="mt-5 text-lg leading-8 text-white/58">
              Use the hosted app when you want speed. Self-host when you want complete
              control.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-8 md:p-10">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <Cloud className="size-10 text-[#a78bfa]" />
                  <h3 className="text-2xl font-bold">Hosted web app</h3>
                </div>
                <p className="mb-10 text-lg leading-8 text-white/62">
                  The fastest way to try Open Canvas. Use the Cyberbara-hosted app,
                  keep your workflow in the browser, and bring your own API keys.
                </p>
              </div>
              <Link
                href="/canvas"
                className="landing-glow-button inline-flex items-center justify-center gap-3 rounded-xl bg-white px-8 py-5 text-lg font-bold text-[#0b0b0f] transition hover:scale-[1.02]"
              >
                Launch web app
                <ArrowUpRight className="size-5" />
              </Link>
            </article>

            <article className="flex flex-col rounded-2xl border border-white/10 bg-[#050505] p-8 md:p-10">
              <div className="mb-6 flex items-center gap-3">
                <TerminalSquare className="size-10 text-[#65d6ad]" />
                <h3 className="text-2xl font-bold">Self-hosted with AI</h3>
              </div>
              <p className="mb-6 text-sm leading-6 text-white/58">
                Ask your desktop AI agent to install and run the project locally. It can
                read the repository, install dependencies, and start the app for you.
              </p>

              <div className="mt-auto overflow-hidden rounded-xl border border-white/10 bg-[#111] font-mono text-sm shadow-2xl">
                <div className="flex items-center gap-2 border-b border-white/8 bg-[#222] px-4 py-2">
                  <div className="size-3 rounded-full bg-[#ef4444]" />
                  <div className="size-3 rounded-full bg-[#f59e0b]" />
                  <div className="size-3 rounded-full bg-[#22c55e]" />
                  <span className="ml-3 text-xs text-white/36">ai-agent ~ prompt</span>
                </div>
                <div className="p-6">
                  <div className="mb-2 select-none text-white/36">
                    # Send this command to your AI agent:
                  </div>
                  <div className="flex gap-2">
                    <span className="select-none text-[#65d6ad]">&gt;</span>
                    <p className="leading-7 text-white/78">
                      Setup and run Open Canvas on the desktop for me. Read{' '}
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#a78bfa] underline decoration-[#a78bfa]/30 underline-offset-4"
                      >
                        https://github.com/ZeroLu/open-canvas
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" className="relative z-10 border-t border-white/8 py-24">
        <div className="mx-auto max-w-3xl px-5 md:px-6">
          <h2 className="mb-10 text-center text-3xl font-bold">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{faq.question}</span>
                  <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-6 text-sm leading-7 text-white/58">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-[#060608] py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 md:flex-row md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-[linear-gradient(135deg,#8b5cf6,#2563eb)]">
              <Workflow className="size-3.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Open Canvas</span>
          </Link>

          <p className="text-center text-sm text-white/42">
            Built by{' '}
            <a
              href="https://cyberbara.com"
              target="_blank"
              rel="noreferrer"
              className="text-white transition hover:text-[#a78bfa]"
            >
              Cyberbara
            </a>
            . Fully open source.
          </p>

          <div className="flex items-center gap-5">
            <a href={githubUrl} target="_blank" rel="noreferrer" className="text-white/42 transition hover:text-white">
              <span className="sr-only">GitHub</span>
              <Github className="size-6" />
            </a>
            <a href="mailto:support@cyberbara.com" className="text-white/42 transition hover:text-white">
              <span className="sr-only">Email</span>
              <Mail className="size-6" />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

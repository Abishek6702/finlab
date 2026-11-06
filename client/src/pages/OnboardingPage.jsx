import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Moon, Sparkles, Sun } from 'lucide-react';
import { countries, currencies, countryFromBrowserLocale, languages, validTimezone } from '../data/localeOptions';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import DashboardPage from './DashboardPage';

const steps = ['Location', 'Region', 'Preferences'];
function browserTimezone() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return validTimezone(zone) ? zone : 'Asia/Kolkata';
  } catch { return 'Asia/Kolkata'; }
}

function getInitialValues(user, theme) {
  const country = countryFromBrowserLocale();
  const supportedTimezone = validTimezone(user?.timezone) && user.timezone !== 'IST' ? user.timezone : browserTimezone();
  const savedCountry = countries.some((item) => item.code === user?.country) ? user.country : country;
  const suggestedCurrency = countries.find((item) => item.code === savedCountry)?.currency || 'INR';
  const savedCurrency = currencies.some((item) => item.code === user?.baseCurrency) ? user.baseCurrency : suggestedCurrency;
  return {
    country: savedCountry,
    baseCurrency: user?.baseCurrency && user.baseCurrency !== 'INR' ? savedCurrency : suggestedCurrency,
    timezone: supportedTimezone,
    language: languages.some((item) => item.code === user?.language) ? user.language : 'en',
    theme: theme === 'dark' ? 'dark' : 'light',
    weekStartsOn: ['Monday', 'Sunday'].includes(user?.weekStartsOn) ? user.weekStartsOn : 'Monday',
  };
}

function Field({ id, label, hint, children }) {
  return <div><label htmlFor={id} className="mb-2 block text-xs font-semibold text-[var(--text)]">{label}</label>{children}{hint && <p className="mt-1.5 mb-0 text-[11px] text-[var(--text-muted)]">{hint}</p>}</div>;
}

const inputClass = 'h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15';

function Select({ label, hint, value, onChange, children }) {
  const id = `preference-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
  return <Field id={id} label={label} hint={hint}><select id={id} className={inputClass} value={value} onChange={onChange}>{children}</select></Field>;
}

export default function OnboardingPage() {
  const { user, updateProfile, completeOnboarding } = useAuth();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const storageKey = `finlab:onboarding:${user?._id || user?.id || 'account'}:draft`;
  const [draft] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null'); }
    catch { return null; }
  });
  const [step, setStep] = useState(() => Math.min(Math.max(draft?.step || 0, 0), steps.length - 1));
  const [values, setValues] = useState(() => draft?.values
    ? { ...draft.values, theme: draft.values.theme === 'dark' ? 'dark' : 'light' }
    : getInitialValues(user, preference));
  const [currencyManuallySelected, setCurrencyManuallySelected] = useState(() => Boolean(draft?.currencyManuallySelected));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.onboardingCompleted === true) navigate('/dashboard', { replace: true });
  }, [navigate, user]);

  useEffect(() => {
    if (draft?.values?.theme) {
      setPreference(draft.values.theme === 'dark' ? 'dark' : 'light');
    }
  }, [draft, setPreference]);

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ values, step, currencyManuallySelected })); } catch { /* Draft persistence is best effort. */ }
  }, [storageKey, values, step, currencyManuallySelected]);

  const timezones = useMemo(() => {
    const standard = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/London', 'Europe/Paris', 'America/Los_Angeles', 'America/New_York', 'UTC'];
    return [...new Set([values.timezone, ...standard].filter(validTimezone))].sort((a, b) => a.localeCompare(b));
  }, [values.timezone]);

  const patchValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const setCountry = (country) => {
    setValues((current) => ({ ...current, country, ...(!currencyManuallySelected ? { baseCurrency: countries.find((item) => item.code === country)?.currency || current.baseCurrency } : {}) }));
    setError('');
  };

  const validateStep = () => {
    if (step === 0 && !countries.some((country) => country.code === values.country)) return 'Choose a country to continue.';
    if (step === 0 && !currencies.some((currency) => currency.code === values.baseCurrency)) return 'Choose a base currency to continue.';
    if (step === 1 && !validTimezone(values.timezone)) return 'Choose a valid timezone to continue.';
    if (step === 1 && !languages.some((language) => language.code === values.language)) return 'Choose a supported language to continue.';
    if (step === 2 && !['light', 'dark'].includes(values.theme)) return 'Choose a theme to continue.';
    if (step === 2 && !['Monday', 'Sunday'].includes(values.weekStartsOn)) return 'Choose which day your week starts on.';
    return '';
  };

  const next = () => {
    const validation = validateStep();
    if (validation) { setError(validation); return; }
    setError('');
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const finish = async (savePreferences) => {
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      if (savePreferences) await updateProfile(values);
      await completeOnboarding();
      sessionStorage.removeItem(storageKey);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not save your preferences. Your selections are still here; please try again.');
    } finally { setIsSaving(false); }
  };

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const handleDialogKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const selectedCountry = countries.find((item) => item.code === values.country);
  const selectedCurrency = currencies.find((item) => item.code === values.baseCurrency);

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none select-none blur-[3px] brightness-[.58] transition-[filter] duration-300"><DashboardPage /></div>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" onKeyDown={handleDialogKeyDown}>
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="onboarding-dialog-title" tabIndex={-1} className="grid max-h-[calc(100dvh-24px)] w-full max-w-[960px] grid-cols-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-2xl outline-none md:max-h-[min(760px,calc(100dvh-48px))] md:grid-cols-[230px_minmax(0,1fr)]">
          <h2 id="onboarding-dialog-title" className="sr-only">FinLab workspace setup, step {step + 1}: {steps[step]}</h2>
          <aside className="hidden flex-col bg-[var(--surface-raised)] p-6 md:flex">
            <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-xs font-bold text-white">FL</span><div><div className="text-sm font-bold">FinLab</div><div className="text-[10px] text-[var(--text-muted)]">WORKSPACE SETUP</div></div></div>
            <div className="mt-10"><p className="mb-1 text-[10px] font-semibold tracking-[.12em] text-[var(--text-muted)] uppercase">Personalize</p><p className="m-0 text-lg font-semibold leading-snug tracking-tight">Make FinLab work for you.</p><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">A few preferences help shape a more useful daily overview.</p></div>
            <ol className="mt-8 grid gap-2" aria-label="Onboarding progress">
              {steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs ${step === index ? 'bg-[var(--surface)] font-semibold text-[var(--primary)] shadow-sm' : index < step ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full border text-[10px] ${step === index ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : index < step ? 'border-[var(--primary)]/30 bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)]'}`}>{index < step ? <Check size={13} aria-hidden="true" /> : index + 1}</span>{label}</li>)}
            </ol>
            <div className="mt-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"><div className="text-[11px] font-semibold">Your money stays yours</div><p className="mt-1 mb-0 text-[10px] leading-4 text-[var(--text-secondary)]">These choices affect display preferences. They won&apos;t change account balances or transaction amounts.</p></div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-8">
              <div><p className="m-0 text-[10px] font-semibold tracking-[.1em] text-[var(--primary)] uppercase">Workspace setup</p><p className="mt-1 mb-0 text-xs text-[var(--text-secondary)]">Step {step + 1} of {steps.length} <span className="mx-1.5 text-[var(--text-muted)]">·</span>{steps[step]}</p></div>
              <button type="button" onClick={() => finish(false)} disabled={isSaving} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]">Skip for now</button>
            </header>
            <div className="h-1 bg-[var(--surface-raised)] md:hidden"><div className="h-full bg-[var(--primary)] transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
              {step === 0 && <div><div className="mb-5 grid size-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-lg text-[var(--primary)]"><Sparkles size={20} aria-hidden="true" /></div><p className="mb-2 text-[10px] font-semibold tracking-[.12em] text-[var(--primary)] uppercase">Welcome to FinLab{user?.firstName ? `, ${user.firstName}` : ''}</p><h1 className="m-0 text-2xl font-semibold tracking-tight">Let&apos;s set up your workspace</h1><p className="mt-2 mb-7 text-sm leading-6 text-[var(--text-secondary)]">Start with your country and preferred reporting currency. You can review and change your choices before saving.</p><div className="grid gap-5 sm:grid-cols-2">
                <Select label="Country or region" hint="Suggested from your browser locale; please confirm." value={values.country} onChange={(event) => setCountry(event.target.value)}><option value="">Select country</option>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</Select>
                <Select label="Base currency" hint="Preferred reporting currency. Account currencies remain separate." value={values.baseCurrency} onChange={(event) => { setCurrencyManuallySelected(true); patchValue('baseCurrency', event.target.value); }}><option value="">Select currency</option>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.symbol} · {currency.name}</option>)}</Select>
              </div>{selectedCountry && selectedCurrency && <div className="mt-5 rounded-lg border border-[var(--border)] px-4 py-3 text-xs text-[var(--text-secondary)]">{selectedCountry.name} · Reporting in <strong className="font-semibold text-[var(--text)]">{selectedCurrency.code} ({selectedCurrency.symbol})</strong></div>}</div>}

              {step === 1 && <div><h1 className="m-0 text-2xl font-semibold tracking-tight">Regional preferences</h1><p className="mt-2 mb-7 text-sm text-[var(--text-secondary)]">Set the timezone used for dates and choose your workspace language.</p><div className="grid gap-5 sm:grid-cols-2">
                <Select label="Timezone" hint="Suggested from your device settings." value={values.timezone} onChange={(event) => patchValue('timezone', event.target.value)}><option value="">Select timezone</option>{timezones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</Select>
                <Select label="Language" hint="More languages may be added in future." value={values.language} onChange={(event) => patchValue('language', event.target.value)}>{languages.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}</Select>
              </div></div>}

              {step === 2 && <div><h1 className="m-0 text-2xl font-semibold tracking-tight">Make it feel like yours</h1><p className="mt-2 mb-7 text-sm text-[var(--text-secondary)]">Choose your appearance and the first day of your week.</p><div className="space-y-7">
                <div><p className="mb-3 text-xs font-semibold">Appearance</p><div className="grid max-w-lg gap-3 sm:grid-cols-2">{[['light', Sun, 'Light', 'Bright surfaces'], ['dark', Moon, 'Dark', 'Low-light palette']].map(([value, Icon, label, description]) => <button key={value} type="button" onClick={() => { patchValue('theme', value); setPreference(value); }} aria-pressed={values.theme === value} className={`rounded-xl border p-4 text-left transition-colors ${values.theme === value ? 'border-[var(--primary)] bg-[var(--primary-soft)]/40 ring-1 ring-[var(--primary)]' : 'border-[var(--border)] hover:bg-[var(--surface-raised)]'}`}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span className="mt-2 block text-xs font-semibold">{label}</span><span className="mt-1 block text-[10px] text-[var(--text-secondary)]">{description}</span></button>)}</div></div>
                <div><p className="mb-3 text-xs font-semibold">Week starts on</p><div className="grid max-w-sm grid-cols-2 gap-3">{['Monday', 'Sunday'].map((day) => <button key={day} type="button" onClick={() => patchValue('weekStartsOn', day)} aria-pressed={values.weekStartsOn === day} className={`rounded-lg border px-4 py-3 text-left text-xs font-medium ${values.weekStartsOn === day ? 'border-[var(--primary)] bg-[var(--primary-soft)]/40 text-[var(--primary)]' : 'border-[var(--border)] hover:bg-[var(--surface-raised)]'}`}>{day}</button>)}</div></div>
              </div></div>}

             
              {error && <div role="alert" className="mt-6 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-400">{error}</div>}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4 sm:px-8">
              {step > 0 ? <button type="button" onClick={() => { setError(''); setStep((current) => current - 1); }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-raised)]"><ArrowLeft size={14} aria-hidden="true" />Back</button> : <span className="text-[10px] text-[var(--text-muted)]">About a minute to complete</span>}
              {step < steps.length - 1 ? <button type="button" onClick={next} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-xs font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]">Continue <ArrowRight size={15} aria-hidden="true" /></button> : <button type="button" onClick={() => finish(true)} disabled={isSaving} className="h-10 rounded-lg bg-[var(--primary)] px-5 text-xs font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-wait disabled:opacity-70">{isSaving ? 'Saving preferences…' : 'Complete Setup'}</button>}
            </footer>
          </div>
        </section>
      </div>
    </>
  );
}

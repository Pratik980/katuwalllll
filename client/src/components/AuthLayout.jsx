import React from 'react';
import { GitBranch, ShieldCheck, MessageSquare, Users, Globe } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { useLanguage } from '../context/LanguageContext';

export default function AuthLayout({ children, title, subtitle }) {
  const { logo, name: orgName } = useOrganization();
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ne' : 'en');
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Left Hero Side (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-white flex-col justify-between p-12 xl:p-16 overflow-hidden select-none">
        {/* Subtle Decorative Background Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Top: Logo & Organization Identity */}
        <div className="relative z-10 flex items-center gap-3.5">
          {logo ? (
            <img
              src={logo}
              alt={orgName || 'Katuwal Banshabatika'}
              className="h-12 w-12 rounded-2xl object-contain bg-white/10 p-1.5 border border-white/20 backdrop-blur-md shadow-lg"
            />
          ) : (
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-white text-xl shadow-lg border border-white/20">
              KB
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {orgName || 'Katuwal Banshabatika'}
            </h2>
            <p className="text-xs text-emerald-200/80 font-medium">
              {t('brand_subtagline') || 'Official Lineage & Genealogy System'}
            </p>
          </div>
        </div>

        {/* Center: Inspirational Headline & Feature Cards */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-6 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('brand_tagline') || 'Preserving Heritage • Connecting Generations'}</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {language === 'ne'
              ? 'पुर्खाको इतिहास संरक्षण र नयाँ पुस्ताको आत्मीय मिलन'
              : 'Preserving Our Lineage. Connecting Every Generation.'}
          </h1>
          <p className="mt-4 text-emerald-100/75 text-sm xl:text-base leading-relaxed">
            {language === 'ne'
              ? 'कटुवाल वंशबाटिकामा स्वागत छ। पुस्तान्तरणको विवरण, वंशवृक्ष, पारिवारिक दस्तावेज र संवाद एकै सुरक्षित थलोमा।'
              : 'Welcome to Katuwal Banshabatika. Explore comprehensive lineage records, historical family branches, verified member databases, and community discussions in one unified, secure platform.'}
          </p>

          {/* Feature Highlights Grid */}
          <div className="mt-8 space-y-3.5">
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition">
              <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {language === 'ne' ? 'अन्तर्क्रियात्मक वंशवृक्ष' : 'Interactive Genealogy Tree'}
                </p>
                <p className="text-xs text-emerald-200/70">
                  {language === 'ne' ? 'पुस्ता पुस्ताका सम्बन्धहरू एकै स्थानमा सहजै खोजी गर्नुहोस्' : 'Explore multi-generational family trees and lineage connections'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition">
              <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {language === 'ne' ? 'प्रमाणित सदस्य अभिलेख' : 'Verified Member Registry'}
                </p>
                <p className="text-xs text-emerald-200/70">
                  {language === 'ne' ? 'घर नम्बर, वंश पुस्ता र परिचय विवरण सुरक्षित रूपमा अभिलेख' : 'Secure identification, household data & official genealogical archive'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition">
              <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {language === 'ne' ? 'पारिवारिक संवाद र सूचना' : 'Community Discussions & Events'}
                </p>
                <p className="text-xs text-emerald-200/70">
                  {language === 'ne' ? 'कुलका सदस्यहरूसँग प्रत्यक्ष कुराकानी र ताजा गतिविधि' : 'Direct live chat channels, community announcements and updates'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Badge */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-emerald-200/60">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <span>99+ Verified Family Members</span>
          </span>
          <span>© 2026 Katuwal Bansha</span>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen overflow-y-auto">
        {/* Top Header Controls: Mobile Logo + Language Selector */}
        <div className="w-full max-w-md mx-auto flex items-center justify-between">
          <div className="flex lg:hidden items-center gap-2.5">
            {logo ? (
              <img src={logo} alt="" className="h-9 w-9 rounded-xl object-contain border border-slate-200 p-0.5 bg-white shadow-xs" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                KB
              </div>
            )}
            <span className="font-bold text-slate-800 text-sm">
              {orgName || 'Katuwal Bansha'}
            </span>
          </div>
          <div className="hidden lg:block" />

          {/* Language Toggle Pill */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-95"
            title="Toggle Language"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-700" />
            <span>{language === 'en' ? 'नेपाली' : 'English'}</span>
            <span className="text-xs">{language === 'en' ? '🇳🇵' : '🇬🇧'}</span>
          </button>
        </div>

        {/* Form Body Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>

        {/* Footer */}
        <div className="w-full max-w-md mx-auto text-center text-xs text-slate-400 pt-6">
          <p>
            Katuwal Banshabatika Platform • {language === 'ne' ? 'सबै अधिकार सुरक्षित' : 'All rights reserved'}
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CheckCircle2,
  Sparkles,
  Store,
  Plus,
  Bell,
  Bookmark,
  ArrowRight,
  Clock,
  Coins,
  FileText,
  CheckSquare,
  Square,
  X,
  Building2,
  Scale,
  ShieldCheck,
  Lock,
  Check,
  Search,
  Coffee,
  Utensils,
  Globe,
  Scissors,
  Shirt,
  PawPrint,
  Droplets,
  SkipForward,
  Lightbulb,
  Code,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Trash2,
  FolderKanban,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { fetchUserRoadmap, saveUserRoadmap, RoadmapTask, getDefaultPhilippineRoadmapTasks } from '@/services/supabase';
import {
  STARTUP_TEMPLATES,
  TEMPLATE_CATEGORIES,
  TemplateCategory,
  TemplateIcon,
  filterTemplates,
} from '@/services/startupTemplates';
import {
  UserSavedRoadmap,
  getSavedRoadmaps,
  saveAllRoadmaps,
  getActiveRoadmapMeta,
  setActiveRoadmapMeta,
  syncActiveRoadmapTasks,
  switchRoadmap,
  deleteSavedRoadmap,
  getRoadmapProgress,
} from '@/services/roadmapStorage';
import { notify } from '@/utils/dialog';
import { askKhoraAI } from '@/services/claude';
import { getNextStepRecommendation, NextStepRecommendation } from '@/services/nextStepAdvisor';
import {
  matchRegistryProfile,
  analyzeBusinessRegulation,
  RegulatoryProfile,
} from '@/services/regulatoryAdvisor';

// Helper to guarantee authentic legal basis, agency, timeline, cost, required docs, and actionable sub-steps for any task
const ensureSubSteps = (task: RoadmapTask): RoadmapTask => {
  const isGenericLegalBasis =
    !task.legal_basis ||
    task.legal_basis === 'Philippine Business Regulatory Compliance Standards';

  if (task.sub_steps && task.sub_steps.length > 0 && !isGenericLegalBasis) return task;

  const defaultSubStepsMap: Record<string, { legal: string; agency: string; time: string; cost: string; docs: string[]; sub: string[] }> = {
    'Barangay': {
      legal: 'RA 9178 (BMBE Act) & RA 7160 Local Government Code',
      agency: 'Local Barangay Hall BPLO Desk',
      time: '1 - 2 Business Days',
      cost: '₱200 - ₱500',
      docs: ['2 Valid Government IDs', 'Community Tax Certificate (Cedula)', 'Lease Contract / Proof of Address'],
      sub: [
        'Request Barangay Business Permit Application Form at Barangay BPLO Desk',
        'Present 2 Valid Government IDs, Cedula & Lease Contract / Homeowner Consent',
        'Pay Barangay Clearance Fee (₱200 - ₱500 based on LGU Ordinance)',
        'Collect signed Barangay Micro-Business Clearance Certificate with official dry seal',
      ],
    },
    'DTI': {
      legal: 'Act No. 3883 (Philippine Business Name Law)',
      agency: 'Department of Trade and Industry (DTI BNRS)',
      time: '30 - 60 Minutes (Online)',
      cost: '₱530 (City/Municipal Scope + Doc Stamp)',
      docs: ['1 Valid Government ID', 'DTI BNRS Online Application Form'],
      sub: [
        'Access official DTI BNRS portal at bnrs.dti.gov.ph',
        'Input proposed business name (Dominant Name + Business Descriptor)',
        'Select territorial scope (City/Municipal) & pay ₱530 via GCash/Maya',
        'Download & print official DTI Certificate of Business Name Registration (Valid 5 Years)',
      ],
    },
    'Mayor': {
      legal: 'Local Government Code of 1991 (RA 7160 Sec 143/151)',
      agency: 'City / Municipal Hall BPLO & Bureau of Fire Protection',
      time: '3 - 7 Business Days',
      cost: '₱1,500 - ₱4,000',
      docs: ['DTI Certificate', 'Barangay Clearance', 'BFP Fire Safety Inspection Cert', 'Zoning Clearance'],
      sub: [
        'Submit DTI Certificate & Barangay Clearance to City BPLO window',
        'Undergo BFP Fire Safety Inspection & City Health Sanitary Inspection',
        'Pay Mayor Permit Fee, Garbage Fee & Sanitary License at City Treasurer',
        'Claim official Mayor Business Permit, Business Plate & Sanitary Inspection Sticker',
      ],
    },
    'FDA': {
      legal: 'RA 10918 (Philippine Pharmacy Act) & RA 9711 (FDA Act of 2009)',
      agency: 'Food and Drug Administration (FDA eServices)',
      time: '15 - 30 Business Days',
      cost: '₱2,000 - ₱5,000',
      docs: [
        'PRC Pharmacist License & Notarized Agreement',
        'FDA eServices Application Form',
        'Store Floor Plan & Vicinity Map',
        'Refrigerator & Thermometer Calibration Proof',
        'Philippine National Drug Formulary (PNDF)',
      ],
      sub: [
        'Contract PRC Registered Pharmacist and notarize Pharmacist-Owner Agreement',
        'Equip store with dedicated pharmaceutical refrigerator and digital temperature logbook',
        'Register FDA eServices account at eservices.fda.gov.ph and submit LTO Drug Outlet form',
        'Upload location floor plan, pharmacist credentials, and pay official FDA inspection fee',
        'Undergo FDA post-marketing inspection and download official LTO Certificate',
      ],
    },
    'Pharmacy': {
      legal: 'RA 10918 (Philippine Pharmacy Act) & RA 9711 (FDA Act of 2009)',
      agency: 'Food and Drug Administration (FDA eServices)',
      time: '15 - 30 Business Days',
      cost: '₱2,000 - ₱5,000',
      docs: [
        'PRC Pharmacist License & Notarized Agreement',
        'FDA eServices Application Form',
        'Store Floor Plan & Vicinity Map',
        'Refrigerator & Thermometer Calibration Proof',
        'Philippine National Drug Formulary (PNDF)',
      ],
      sub: [
        'Contract PRC Registered Pharmacist and notarize Pharmacist-Owner Agreement',
        'Equip store with dedicated pharmaceutical refrigerator and digital temperature logbook',
        'Register FDA eServices account at eservices.fda.gov.ph and submit LTO Drug Outlet form',
        'Upload location floor plan, pharmacist credentials, and pay official FDA inspection fee',
        'Undergo FDA post-marketing inspection and download official LTO Certificate',
      ],
    },
    'Potability': {
      legal: 'PD 856 (Sanitation Code) & PNSDW (AO 2017-0010)',
      agency: 'City Health Office Sanitation Division & DOH Accredited Lab',
      time: '7 - 14 Business Days',
      cost: '₱3,000 - ₱6,000',
      docs: [
        'DOH-Accredited Lab Microbiological Test',
        'Physical-Chemical Lab Test Report',
        'Personnel Sanitary Health Cards',
        'Water Treatment System Flowchart Schematic',
      ],
      sub: [
        'Submit product water samples to DOH-accredited testing laboratory for bacteriological analysis',
        'Send station crew to City Health Office for chest X-ray, stool test, and pink health cards',
        'Establish documented daily backwashing and UV lamp inspection logbook',
        'Undergo City Sanitary Inspector on-site inspection of filling room and wash sink',
        'Claim official Sanitary Permit and framed Certificate of Potability for public display',
      ],
    },
    'Water': {
      legal: 'PD 856 (Sanitation Code) & PNSDW (AO 2017-0010)',
      agency: 'City Health Office Sanitation Division & DOH Accredited Lab',
      time: '7 - 14 Business Days',
      cost: '₱3,000 - ₱6,000',
      docs: [
        'DOH-Accredited Lab Microbiological Test',
        'Physical-Chemical Lab Test Report',
        'Personnel Sanitary Health Cards',
        'Water Treatment System Flowchart Schematic',
      ],
      sub: [
        'Submit product water samples to DOH-accredited testing laboratory for bacteriological analysis',
        'Send station crew to City Health Office for chest X-ray, stool test, and pink health cards',
        'Establish documented daily backwashing and UV lamp inspection logbook',
        'Undergo City Sanitary Inspector on-site inspection of filling room and wash sink',
        'Claim official Sanitary Permit and framed Certificate of Potability for public display',
      ],
    },
    'Sanitary': {
      legal: 'PD 856 Sanitation Code & RA 10611 Food Safety Act of 2013',
      agency: 'City / Municipal Health Office Sanitation Section',
      time: '5 - 10 Business Days',
      cost: '₱1,500 - ₱3,500',
      docs: [
        'Staff Medical Exam & Laboratory Clearances',
        'Grease Trap Installation Receipt/Photo',
        'Pest Control Inspection Certification',
        'Potable Water Source Certificate',
      ],
      sub: [
        'Coordinate staff laboratory tests (chest X-ray & stool examination) at City Health Clinic',
        'Install required kitchen grease trap and ensure food warmers have glass sneeze guards',
        'Attend LGU Food Safety & Hygiene Seminar to secure food handler credentials',
        'Undergo City Sanitary Inspector kitchen and dining inspection',
        'Obtain framed Sanitary Permit to Operate and post prominently in dining area',
      ],
    },
    'Food': {
      legal: 'PD 856 Sanitation Code & RA 10611 Food Safety Act of 2013',
      agency: 'City / Municipal Health Office Sanitation Section',
      time: '5 - 10 Business Days',
      cost: '₱1,500 - ₱3,500',
      docs: [
        'Staff Medical Exam & Laboratory Clearances',
        'Grease Trap Installation Receipt/Photo',
        'Pest Control Inspection Certification',
        'Potable Water Source Certificate',
      ],
      sub: [
        'Coordinate staff laboratory tests (chest X-ray & stool examination) at City Health Clinic',
        'Install required kitchen grease trap and ensure food warmers have glass sneeze guards',
        'Attend LGU Food Safety & Hygiene Seminar to secure food handler credentials',
        'Undergo City Sanitary Inspector kitchen and dining inspection',
        'Obtain framed Sanitary Permit to Operate and post prominently in dining area',
      ],
    },
    'Veterinary': {
      legal: 'RA 8485 (Animal Welfare Act) & RA 9482 (Anti-Rabies Act)',
      agency: 'Bureau of Animal Industry (BAI) & City Veterinary Office',
      time: '10 - 20 Business Days',
      cost: '₱2,500 - ₱5,000',
      docs: [
        'PRC Veterinarian License & Certificate of Good Standing',
        'BAI Animal Facility Application Form',
        'Clinic Floor Plan with Isolation Area',
        'Biohazard / Sharps Waste Disposal Agreement',
      ],
      sub: [
        'Partner with PRC Licensed Veterinarian and register with City Veterinary Office',
        'Install proper stainless cages, isolation ward, and dedicated medical waste container',
        'Submit Animal Facility Registration application to Bureau of Animal Industry (BAI)',
        'Undergo BAI facility inspection evaluating ventilation, sanitation, and animal welfare',
        'Receive official BAI Certificate of Registration for public clinic display',
      ],
    },
    'BAI': {
      legal: 'RA 8485 (Animal Welfare Act) & RA 9482 (Anti-Rabies Act)',
      agency: 'Bureau of Animal Industry (BAI) & City Veterinary Office',
      time: '10 - 20 Business Days',
      cost: '₱2,500 - ₱5,000',
      docs: [
        'PRC Veterinarian License & Certificate of Good Standing',
        'BAI Animal Facility Application Form',
        'Clinic Floor Plan with Isolation Area',
        'Biohazard / Sharps Waste Disposal Agreement',
      ],
      sub: [
        'Partner with PRC Licensed Veterinarian and register with City Veterinary Office',
        'Install proper stainless cages, isolation ward, and dedicated medical waste container',
        'Submit Animal Facility Registration application to Bureau of Animal Industry (BAI)',
        'Undergo BAI facility inspection evaluating ventilation, sanitation, and animal welfare',
        'Receive official BAI Certificate of Registration for public clinic display',
      ],
    },
    'PCAB': {
      legal: 'RA 4566 (Contractor Licensing Law) & DOLE DO 198-18 (OSH Act)',
      agency: 'Philippine Contractors Accreditation Board (PCAB / CIAP)',
      time: '20 - 45 Business Days',
      cost: '₱7,000 - ₱15,000',
      docs: [
        'AMO Seminar Completion Certificate',
        'COSH 40-Hour Safety Officer Certificate',
        'Audited Financial Statements / Bank Certification',
        'DTI Certificate / SEC Registration',
      ],
      sub: [
        'Complete the 16-hour Authorized Managing Officer (AMO) seminar via CIAP portal',
        'Appoint staff member to complete 40-hour DOLE COSH Safety Officer training',
        'Compile audited balance sheet verifying required net worth capitalization',
        'File online PCAB License application through the CIAP contractor portal',
        'Claim official PCAB Contractor License Certificate and verify active listing',
      ],
    },
    'Contractor': {
      legal: 'RA 4566 (Contractor Licensing Law) & DOLE DO 198-18 (OSH Act)',
      agency: 'Philippine Contractors Accreditation Board (PCAB / CIAP)',
      time: '20 - 45 Business Days',
      cost: '₱7,000 - ₱15,000',
      docs: [
        'AMO Seminar Completion Certificate',
        'COSH 40-Hour Safety Officer Certificate',
        'Audited Financial Statements / Bank Certification',
        'DTI Certificate / SEC Registration',
      ],
      sub: [
        'Complete the 16-hour Authorized Managing Officer (AMO) seminar via CIAP portal',
        'Appoint staff member to complete 40-hour DOLE COSH Safety Officer training',
        'Compile audited balance sheet verifying required net worth capitalization',
        'File online PCAB License application through the CIAP contractor portal',
        'Claim official PCAB Contractor License Certificate and verify active listing',
      ],
    },
    'BMBE': {
      legal: 'RA 9178 (Barangay Micro Business Enterprises Act) & RA 7394 (Consumer Act)',
      agency: 'DTI Negosyo Center & Local BPLO',
      time: '3 - 7 Business Days',
      cost: '₱500 - ₱1,500',
      docs: [
        'DTI Certificate of Business Name Registration',
        'Barangay Clearance with Micro-Enterprise Notation',
        'Notarized Certificate of Total Assets (under ₱3 Million)',
      ],
      sub: [
        'File BMBE application at local DTI Negosyo Center for 100% income tax exemption',
        'Affix clear peso price tags to every product shelf complying with RA 7394 Price Tag Law',
        'Ensure no tobacco or alcohol is displayed within 100 meters of any school or playground',
        'Register BMBE status with assigned BIR RDO to formalize tax exemption endorsement',
      ],
    },
    'BIR': {
      legal: 'National Internal Revenue Code (NIRC Sec 236) & RR 11-2018',
      agency: 'Bureau of Internal Revenue (BIR Revenue District Office)',
      time: '3 - 5 Business Days',
      cost: '₱530 ARF + ~₱1,000 Receipt Printing',
      docs: ['BIR Form 1901', 'DTI Certificate', 'Mayor Permit / Barangay Clearance', '2 Valid IDs'],
      sub: [
        'File BIR Form 1901 at your assigned BIR Revenue District Office (RDO)',
        'Pay ₱500 Annual Registration Fee (ARF) + ₱30 Loose Documentary Stamp',
        'Register Official Books of Accounts (General Journal & Ledger)',
        'Apply for BIR Authority to Print (ATP) & receive BIR Form 2303 Certificate',
      ],
    },
    'SSS': {
      legal: 'RA 11199 (SS Act), RA 11223 (UHC Act) & RA 9679',
      agency: 'SSS, PhilHealth & Pag-IBIG Fund Offices',
      time: '1 - 2 Days',
      cost: 'Free Registration',
      docs: ['Form R-1 (SSS)', 'PhilHealth ER1 Form', 'Pag-IBIG Employer Form', 'DTI Cert'],
      sub: [
        'Submit SSS Form R-1 & R-1A Employer Registration Form',
        'Submit PhilHealth ER1 Employer Data Record Form',
        'Submit Pag-IBIG Employer Registration Form',
        'Receive Employer ID Numbers for statutory monthly contribution remittance',
      ],
    },
    'Supplies': {
      legal: 'RA 9178 BMBE Financial Compliance & Cost Accounting',
      agency: 'Private Wholesale Distributors',
      time: '2 - 3 Days',
      cost: 'Operating Budget',
      docs: ['Supplier Contacts List', 'Recipe / Costing Sheet', 'GCash Merchant QR'],
      sub: [
        'Research top 3 wholesale suppliers in Divisoria, Balintawak or local market',
        'Itemize raw material & packaging costs per single unit',
        'Add 35% - 50% profit margin markup to cover rent, utilities & net profit',
        'Setup dedicated business e-wallet / GCash Merchant payment account',
      ],
    },
    'Setup': {
      legal: 'RA 7394 Consumer Act of the Philippines (Price Tag Law)',
      agency: 'DTI Fair Trade Bureau & Local Community',
      time: '2 Days',
      cost: '₱1,000 - ₱2,500',
      docs: ['Compliance Posters (BIR 2303, DTI)', 'Price Menu Board', 'Promo Flyers'],
      sub: [
        'Display required compliance permits prominently (BIR 2303, DTI, Sanitary Permit)',
        'Attach clear price tags / menu board on all products (RA 7394 Price Tag Law)',
        'Set up GCash / Maya QR Code payment standee at customer counter',
        'Run 3-day Soft Opening discount promo to test sales workflow and speed',
      ],
    },
  };

  const matchedKey = Object.keys(defaultSubStepsMap).find(key => 
    task.title.toLowerCase().includes(key.toLowerCase()) || 
    (task.desc && task.desc.toLowerCase().includes(key.toLowerCase()))
  );

  let template = matchedKey ? defaultSubStepsMap[matchedKey] : null;

  if (!template) {
    const regProfile = matchRegistryProfile(task.title + ' ' + (task.desc || ''));
    if (regProfile && regProfile.roadmapTask) {
      template = {
        legal: regProfile.roadmapTask.legal_basis,
        agency: regProfile.roadmapTask.agency,
        time: regProfile.roadmapTask.estimated_time,
        cost: regProfile.roadmapTask.estimated_cost,
        docs: regProfile.roadmapTask.required_docs,
        sub: regProfile.roadmapTask.sub_steps.map((s) => s.title),
      };
    } else {
      template = {
        legal: 'Philippine Business Regulatory Compliance Standards',
        agency: 'Local Government Agency / Municipal Hall',
        time: '1 - 2 Business Days',
        cost: 'Standard Legal Fees',
        docs: ['2 Government Valid IDs', 'DTI / Barangay Business Documents'],
        sub: [
          `Review regulatory legal requirements for ${task.title}`,
          `Gather official application forms and required identification documents`,
          `Submit application to designated government agency office / online portal`,
          `Pay official registration fee and secure valid compliance certificate`,
        ],
      };
    }
  }

  const isTaskCompleted = task.status === 'Completed';

  return {
    ...task,
    legal_basis: task.legal_basis || template.legal,
    agency: task.agency || template.agency,
    estimated_time: task.estimated_time || template.time,
    estimated_cost: task.estimated_cost || template.cost,
    required_docs: task.required_docs || template.docs,
    sub_steps: (task.sub_steps && task.sub_steps.length > 0) 
      ? task.sub_steps 
      : template.sub.map((subTitle, idx) => ({
          id: `${task.id || 'step'}-${idx + 1}`,
          title: subTitle,
          completed: isTaskCompleted,
        })),
  };
};

// startupTemplates.ts stays UI-free, so it names an icon and this maps it.
const TEMPLATE_ICONS: Record<TemplateIcon, React.ComponentType<{ size?: number; color?: string }>> = {
  coffee: Coffee,
  store: Store,
  utensils: Utensils,
  globe: Globe,
  scissors: Scissors,
  shirt: Shirt,
  'paw-print': PawPrint,
  droplets: Droplets,
};

export default function RoadmapTab() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { unreadCount, addNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [savedRoadmaps, setSavedRoadmaps] = useState<UserSavedRoadmap[]>([]);
  const [activeRoadmapId, setActiveRoadmapId] = useState<string>('main-journey');
  const [activeRoadmapTitle, setActiveRoadmapTitle] = useState<string>('');
  const [showMyRoadmapsModal, setShowMyRoadmapsModal] = useState(false);
  const [selectedTaskModal, setSelectedTaskModal] = useState<RoadmapTask | null>(null);
  const [aiAdviceModal, setAiAdviceModal] = useState<{ title: string; advice: string } | null>(null);
  const [taskAiAdviceMap, setTaskAiAdviceMap] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory | null>(null);
  const [nextStep, setNextStep] = useState<NextStepRecommendation | null>(null);

  // Phase 3: Dynamic Philippine Industry Regulatory & Legal Compliance Advisor
  const [showRegulatoryModal, setShowRegulatoryModal] = useState(false);
  const [regulatoryQuery, setRegulatoryQuery] = useState('');
  const [isAnalyzingRegulatory, setIsAnalyzingRegulatory] = useState(false);
  const [analyzedRegulatoryProfile, setAnalyzedRegulatoryProfile] = useState<RegulatoryProfile | null>(null);
  const [showJsonExchange, setShowJsonExchange] = useState(false);
  const [sentJsonPayload, setSentJsonPayload] = useState<string | null>(null);
  const [receivedJsonPayload, setReceivedJsonPayload] = useState<string | null>(null);

  const handleOpenRegulatoryAdvisor = (customTarget?: string) => {
    const target = customTarget || userProfile?.business_type || 'General Micro Business';
    setRegulatoryQuery(target);
    const profile = matchRegistryProfile(target);
    setAnalyzedRegulatoryProfile(profile);

    const initialSent = JSON.stringify({
      business_type: target,
      business_name: userProfile?.business_name || `${target} Venture`,
      location: userProfile?.location || 'Philippines',
      category: 'Commercial',
      starting_budget: userProfile?.budget || 'Micro-Enterprise (< ₱100k)',
      registration_type: 'Sole Proprietorship',
      is_product_based: true,
    }, null, 2);

    const initialReceived = JSON.stringify({
      business_type: profile.businessType,
      primary_agency: profile.primaryAgency,
      agency_acronym: profile.agencyAcronym,
      license_name: profile.licenseName,
      legal_basis: profile.legalBasis,
      estimated_time: profile.estimatedTime,
      estimated_cost: profile.estimatedCost,
      focused_requirements: profile.focusedRequirements,
      legal_considerations: profile.legalConsiderations,
      mandatory_discounts_applicable: profile.mandatoryDiscountsApplicable,
      roadmap_task: profile.roadmapTask,
      source: profile.source,
    }, null, 2);

    setSentJsonPayload(initialSent);
    setReceivedJsonPayload(initialReceived);
    setShowRegulatoryModal(true);
  };

  const handleAnalyzeRegulatoryQuery = async (queryText?: string) => {
    const queryToUse = (queryText || regulatoryQuery).trim();
    if (!queryToUse) return;

    setRegulatoryQuery(queryToUse);
    setIsAnalyzingRegulatory(true);
    const reqPayload = {
      businessType: queryToUse,
      businessName: userProfile?.business_name || `${queryToUse} Enterprise`,
      location: userProfile?.location || 'Philippines',
      category: 'Commercial',
      startingBudget: userProfile?.budget || 'Micro-Enterprise',
      registrationType: 'Sole Proprietorship',
      isProductBased: true,
    };

    setSentJsonPayload(JSON.stringify(reqPayload, null, 2));

    try {
      const result = await analyzeBusinessRegulation(reqPayload);
      setAnalyzedRegulatoryProfile(result);
      setReceivedJsonPayload(JSON.stringify({
        business_type: result.businessType,
        primary_agency: result.primaryAgency,
        agency_acronym: result.agencyAcronym,
        license_name: result.licenseName,
        legal_basis: result.legalBasis,
        estimated_time: result.estimatedTime,
        estimated_cost: result.estimatedCost,
        focused_requirements: result.focusedRequirements,
        legal_considerations: result.legalConsiderations,
        mandatory_discounts_applicable: result.mandatoryDiscountsApplicable,
        roadmap_task: result.roadmapTask,
        source: result.source,
      }, null, 2));
    } catch (e) {
      console.warn('Regulatory analysis failed:', e);
    } finally {
      setIsAnalyzingRegulatory(false);
    }
  };

  const handleApplyRegulatoryToRoadmap = async () => {
    if (!analyzedRegulatoryProfile) return;

    const rt = analyzedRegulatoryProfile.roadmapTask;
    const newTasks = [...tasks];
    const existingIndex = newTasks.findIndex(
      (t) =>
        t.id === 'reg-license' ||
        t.title.toLowerCase().includes(analyzedRegulatoryProfile.agencyAcronym.toLowerCase()) ||
        t.title.toLowerCase().includes('fda') ||
        t.title.toLowerCase().includes('potability') ||
        t.title.toLowerCase().includes('pcab') ||
        t.title.toLowerCase().includes('bai') ||
        t.title.toLowerCase().includes('sanitary')
    );

    const updatedTask: RoadmapTask = {
      id: existingIndex !== -1 ? newTasks[existingIndex].id : 'reg-license',
      user_id: user?.uid || 'guest',
      title: rt.title,
      category: 'Permits',
      status: 'Pending',
      desc: rt.desc,
      step_order: existingIndex !== -1 ? newTasks[existingIndex].step_order : 4,
      agency: rt.agency,
      legal_basis: rt.legal_basis,
      estimated_time: rt.estimated_time,
      estimated_cost: rt.estimated_cost,
      required_docs: rt.required_docs,
      sub_steps: rt.sub_steps,
    };

    if (existingIndex !== -1) {
      newTasks[existingIndex] = updatedTask;
    } else {
      const mayorIdx = newTasks.findIndex((t) => t.title.toLowerCase().includes('mayor'));
      const insertAt = mayorIdx !== -1 ? mayorIdx + 1 : Math.min(3, newTasks.length);
      newTasks.splice(insertAt, 0, updatedTask);
    }

    const reordered = newTasks.map((t, idx) => ({ ...t, step_order: idx + 1 }));
    setTasks(reordered);
    setSavedRoadmaps((prev) =>
      prev.map((r) =>
        r.id === activeRoadmapId
          ? { ...r, tasks: reordered, updatedAt: new Date().toISOString() }
          : r
      )
    );
    await syncActiveRoadmapTasks(activeRoadmapId, reordered);
    if (user?.uid) {
      await saveUserRoadmap(reordered);
    }
    setShowRegulatoryModal(false);
    notify(
      'Roadmap Updated!',
      `Applied ${rt.title} with official ${analyzedRegulatoryProfile.agencyAcronym} compliance requirements and legal bases.`
    );
  };

  // Load User Roadmap from Supabase, local cache or generate default with multi-roadmap support
  const loadRoadmap = useCallback(async () => {
    setLoading(true);
    try {
      const storedRoadmaps = await getSavedRoadmaps();
      const meta = await getActiveRoadmapMeta();
      let activeList = storedRoadmaps;
      let activeRoadmap: UserSavedRoadmap | null = null;

      if (activeList.length === 0) {
        // First-time initialization: check cache, remote, or default
        let loadedTasks: RoadmapTask[] = [];
        try {
          const localCached = await AsyncStorage.getItem('@likhora_active_roadmap_tasks');
          if (localCached) {
            const parsed = JSON.parse(localCached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedTasks = parsed;
            }
          }
        } catch (e) {
          console.warn('Error reading @likhora_active_roadmap_tasks:', e);
        }

        if (loadedTasks.length === 0 && user?.uid) {
          const { data } = await fetchUserRoadmap(user.uid);
          if (data && data.length > 0) {
            loadedTasks = data;
          }
        }

        if (loadedTasks.length === 0) {
          loadedTasks = getDefaultPhilippineRoadmapTasks(
            user?.uid || 'guest',
            userProfile?.business_type,
            userProfile?.location
          );
        }

        const hydrated = loadedTasks.map(ensureSubSteps);
        const initialTitle =
          userProfile?.business_name ||
          (userProfile?.business_type ? `${userProfile.business_type} Venture` : 'My Business Venture');
        const initialRoadmap: UserSavedRoadmap = {
          id: 'main-journey',
          title: initialTitle,
          businessType: userProfile?.business_type,
          location: userProfile?.location,
          tasks: hydrated,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        activeList = [initialRoadmap];
        activeRoadmap = initialRoadmap;

        await saveAllRoadmaps(activeList);
        await setActiveRoadmapMeta(initialRoadmap.id, initialRoadmap.title);
        await AsyncStorage.setItem('@likhora_active_roadmap_tasks', JSON.stringify(hydrated));
      } else {
        // We have existing saved roadmaps! Determine active one
        if (meta.id) {
          activeRoadmap = activeList.find((r) => r.id === meta.id) || null;
        }
        if (!activeRoadmap && activeList.length > 0) {
          activeRoadmap = activeList[0];
          await setActiveRoadmapMeta(activeRoadmap.id, activeRoadmap.title);
        }
      }

      setSavedRoadmaps(activeList);

      if (activeRoadmap) {
        setActiveRoadmapId(activeRoadmap.id);
        setActiveRoadmapTitle(activeRoadmap.title);
        const hydrated = activeRoadmap.tasks.map(ensureSubSteps);
        setTasks(hydrated);
        await AsyncStorage.setItem('@likhora_active_roadmap_tasks', JSON.stringify(hydrated));
        if (user?.uid) {
          await saveUserRoadmap(hydrated);
        }
      }
    } catch (err) {
      console.warn('Error during loadRoadmap:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, userProfile?.business_name, userProfile?.business_type, userProfile?.location]);

  useEffect(() => {
    void loadRoadmap();
  }, [loadRoadmap]);

  useFocusEffect(
    useCallback(() => {
      void loadRoadmap();
    }, [loadRoadmap])
  );

  // Objective 4: contextual "what should I do next" guidance. Re-runs
  // whenever the completion pattern actually changes (not on every render),
  // keyed by a cheap signature so completing a task refreshes it without
  // re-firing on unrelated re-renders.
  const taskStatusSignature = tasks.map((t) => `${t.id || t.title}:${t.status}`).join('|');
  useEffect(() => {
    let cancelled = false;
    if (tasks.length === 0) {
      Promise.resolve().then(() => {
        if (!cancelled) setNextStep(null);
      });
      return () => {
        cancelled = true;
      };
    }
    getNextStepRecommendation(tasks).then((rec) => {
      if (!cancelled) setNextStep(rec);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the status signature, not the tasks array identity, to avoid refetching on every unrelated re-render
  }, [taskStatusSignature]);

  // Toggle Main Task Completion Status (Updates all sub-steps too)
  const toggleTaskStatus = async (targetTask: RoadmapTask, index?: number) => {
    const updated = tasks.map((rawTask, idx) => {
      const t = ensureSubSteps(rawTask);
      const isTarget = Boolean(t.id && targetTask.id && t.id === targetTask.id) || t.title === targetTask.title || (index !== undefined && idx === index);

      if (isTarget) {
        const nextCompleted = t.status !== 'Completed';
        if (nextCompleted) {
          addNotification(
            'Roadmap Step Completed! 🎉',
            `You completed "${t.title}". Great progress on your business launch plan!`,
            'roadmap'
          );
        }
        const updatedSubSteps = t.sub_steps?.map(sub => ({ ...sub, completed: nextCompleted })) || [];
        const updatedTask: RoadmapTask = {
          ...t,
          status: (nextCompleted ? 'Completed' : 'Pending') as 'Completed' | 'Pending',
          sub_steps: updatedSubSteps,
        };

        // If open in modal, keep modal state in sync
        if (selectedTaskModal && (selectedTaskModal.id === t.id || selectedTaskModal.title === t.title)) {
          setSelectedTaskModal(updatedTask);
        }

        return updatedTask;
      }
      return t;
    });

    setTasks(updated);
    setSavedRoadmaps((prev) =>
      prev.map((r) =>
        r.id === activeRoadmapId
          ? { ...r, tasks: updated, updatedAt: new Date().toISOString() }
          : r
      )
    );
    await syncActiveRoadmapTasks(activeRoadmapId, updated);
    if (user?.uid) {
      await saveUserRoadmap(updated);
    }
  };

  // Toggle Skip Task Status (TS-08)
  const toggleSkipTask = async (targetTask: RoadmapTask) => {
    const isCurrentlySkipped = targetTask.status === 'Skipped';
    const nextStatus = isCurrentlySkipped ? 'Pending' : 'Skipped';

    const updated = tasks.map((rawTask) => {
      const t = ensureSubSteps(rawTask);
      const isTarget = Boolean(t.id && targetTask.id && t.id === targetTask.id) || t.title === targetTask.title;

      if (isTarget) {
        const updatedTask: RoadmapTask = {
          ...t,
          status: nextStatus,
        };
        if (selectedTaskModal && (selectedTaskModal.id === t.id || selectedTaskModal.title === t.title)) {
          setSelectedTaskModal(updatedTask);
        }
        return updatedTask;
      }
      return t;
    });

    setTasks(updated);
    setSavedRoadmaps((prev) =>
      prev.map((r) =>
        r.id === activeRoadmapId
          ? { ...r, tasks: updated, updatedAt: new Date().toISOString() }
          : r
      )
    );
    await syncActiveRoadmapTasks(activeRoadmapId, updated);
    if (user?.uid) {
      await saveUserRoadmap(updated);
    }

    if (!isCurrentlySkipped) {
      addNotification(
        'Step Skipped',
        `"${targetTask.title}" has been skipped. The next step is now unlocked.`,
        'roadmap'
      );
    }
  };

  // Toggle Individual Sub-Step Completion Status
  const toggleSubStep = async (targetTask: RoadmapTask, subStepId: string) => {
    let updatedModalTask: RoadmapTask | null = null;

    const updated = tasks.map((rawTask) => {
      const t = ensureSubSteps(rawTask);
      const isTarget = Boolean(t.id && targetTask.id && t.id === targetTask.id) || t.title === targetTask.title;

      if (isTarget && t.sub_steps) {
        const updatedSubSteps = t.sub_steps.map(sub => {
          if (sub.id === subStepId) {
            return { ...sub, completed: !sub.completed };
          }
          return sub;
        });

        const completedCount = updatedSubSteps.filter(s => s.completed).length;
        let nextStatus: 'Pending' | 'In Progress' | 'Completed' = 'Pending';
        if (completedCount === updatedSubSteps.length && updatedSubSteps.length > 0) {
          nextStatus = 'Completed';
        } else if (completedCount > 0) {
          nextStatus = 'In Progress';
        }

        const updatedTask: RoadmapTask = {
          ...t,
          status: nextStatus,
          sub_steps: updatedSubSteps,
        };

        updatedModalTask = updatedTask;
        return updatedTask;
      }
      return t;
    });

    setTasks(updated);
    if (updatedModalTask) {
      setSelectedTaskModal(updatedModalTask);
    }
    setSavedRoadmaps((prev) =>
      prev.map((r) =>
        r.id === activeRoadmapId
          ? { ...r, tasks: updated, updatedAt: new Date().toISOString() }
          : r
      )
    );
    await syncActiveRoadmapTasks(activeRoadmapId, updated);
    if (user?.uid) {
      await saveUserRoadmap(updated);
    }
  };

  // Redirect to Khora AI Assistant Chat with pre-filled legal guidance query
  const handleGetTaskAiAdvice = (task: RoadmapTask) => {
    setSelectedTaskModal(null);
    const queryPrompt = `Give 2 concise practical legal & operational tips for a Filipino business owner executing "${task.title}" (${task.legal_basis || 'Philippine Regulatory Law'}) for a "${userProfile?.business_type || 'small business'}" in "${userProfile?.location || 'the Philippines'}".`;

    router.push({
      pathname: '/ai-assistant',
      params: {
        prompt: queryPrompt,
        taskTitle: task.title,
      },
    });
  };

  // Start or Resume Template Roadmap (Preserves all previous roadmaps)
  const handleStartTemplate = async (
    templateName: string,
    templateTasks: Array<Omit<RoadmapTask, 'user_id'>>
  ) => {
    const uid = user?.uid || 'guest';

    // 1. Check if user already started this template!
    const existing = savedRoadmaps.find(
      (r) =>
        r.title.toLowerCase() === templateName.toLowerCase() ||
        r.templateId === templateName
    );

    if (existing) {
      await handleSwitchRoadmap(existing.id);
      notify(
        'Roadmap Resumed',
        `Switched back to your saved "${existing.title}". All your progress has been restored!`
      );
      return;
    }

    // 2. Snapshot current active tasks into savedRoadmaps first so current journey is never lost
    let currentList = savedRoadmaps;
    if (activeRoadmapId && tasks.length > 0) {
      currentList = currentList.map((r) =>
        r.id === activeRoadmapId
          ? { ...r, tasks, updatedAt: new Date().toISOString() }
          : r
      );
    }

    // 3. Prepare new tasks for the template
    const newTasks: RoadmapTask[] = templateTasks.map((t, idx) =>
      ensureSubSteps({
        ...t,
        user_id: uid,
        id: `task-${Date.now()}-${idx}`,
        step_order: idx + 1,
        status: 'Pending',
      })
    );

    const newRoadmapId = `template-${Date.now()}`;
    const newRoadmap: UserSavedRoadmap = {
      id: newRoadmapId,
      title: templateName,
      templateId: templateName,
      tasks: newTasks,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updatedRoadmaps = [newRoadmap, ...currentList];
    setSavedRoadmaps(updatedRoadmaps);
    setActiveRoadmapId(newRoadmapId);
    setActiveRoadmapTitle(templateName);
    setTasks(newTasks);

    await saveAllRoadmaps(updatedRoadmaps);
    await setActiveRoadmapMeta(newRoadmapId, templateName);
    await AsyncStorage.setItem('@likhora_active_roadmap_tasks', JSON.stringify(newTasks));

    if (user?.uid) {
      await saveUserRoadmap(newTasks);
    }

    setShowTemplates(false);
    notify(
      'New Roadmap Started! 🚀',
      `"${templateName}" is now your active journey. Your previous roadmap has been saved and can be resumed anytime from Templates!`
    );
  };

  // Switch to another saved roadmap
  const handleSwitchRoadmap = async (targetId: string) => {
    const result = await switchRoadmap(targetId, tasks, activeRoadmapId);
    if (result.activeRoadmap) {
      const hydrated = result.activeRoadmap.tasks.map(ensureSubSteps);
      setTasks(hydrated);
      setActiveRoadmapId(result.activeRoadmap.id);
      setActiveRoadmapTitle(result.activeRoadmap.title);
      setSavedRoadmaps(result.allRoadmaps);
      if (user?.uid) {
        await saveUserRoadmap(hydrated);
      }
      setShowTemplates(false);
      notify(
        'Roadmap Switched',
        `Now viewing "${result.activeRoadmap.title}". Continue where you left off!`
      );
    }
  };

  // Remove a saved roadmap
  const handleDeleteRoadmap = (roadmapToDelete: UserSavedRoadmap) => {
    if (savedRoadmaps.length <= 1) {
      Alert.alert('Cannot Remove', 'You must have at least one active roadmap.');
      return;
    }

    Alert.alert(
      'Remove Roadmap?',
      `Are you sure you want to remove "${roadmapToDelete.title}"? Your progress on this specific roadmap will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { newActive, remaining } = await deleteSavedRoadmap(roadmapToDelete.id, activeRoadmapId);
            setSavedRoadmaps(remaining);
            if (newActive) {
              setActiveRoadmapId(newActive.id);
              setActiveRoadmapTitle(newActive.title);
              const hydrated = newActive.tasks.map(ensureSubSteps);
              setTasks(hydrated);
              if (user?.uid) {
                await saveUserRoadmap(hydrated);
              }
            }
            notify('Roadmap Removed', `"${roadmapToDelete.title}" was removed.`);
          },
        },
      ]
    );
  };

  // Calculate Progress (Skipped tasks excluded from required denominator)
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const skippedCount = tasks.filter((t) => t.status === 'Skipped').length;
  const effectiveTotal = Math.max(tasks.length - skippedCount, 0);
  const progressPercent = effectiveTotal > 0 ? Math.round((completedCount / effectiveTotal) * 100) : (tasks.length > 0 && completedCount > 0 ? 100 : 0);

  // Guided, sequential ordering: `activeStepIndex` is the first pending step
  const orderedTasks = [...tasks].sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
  const activeStepIndex = orderedTasks.findIndex((t) => t.status !== 'Completed' && t.status !== 'Skipped');
  const currentStepTitle = activeStepIndex >= 0 ? orderedTasks[activeStepIndex].title : null;

  // All steps are unlocked and accessible
  const isTaskLocked = (_task: RoadmapTask): boolean => false;

  // Template Library
  const visibleTemplates = filterTemplates(STARTUP_TEMPLATES, templateSearch, templateCategory);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Header Section */}
        <View style={styles.topHeaderSection}>
          {/* Notification Bell anchored at top right above title */}
          <View style={styles.topNotifBar}>
            <TouchableOpacity 
              style={styles.notifIconBtn} 
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Bell size={19} color={LikhoraColors.textPrimary} />
              {unreadCount > 0 && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          </View>

          {/* Title Row directly below */}
          <View style={styles.headerTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.headerTitle}>Roadmap</Text>
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>{progressPercent}% Done</Text>
              </View>
            </View>
            <Text style={styles.headerSub} numberOfLines={1}>
              {activeRoadmapTitle || userProfile?.business_name || 'My Business'} • {userProfile?.location || 'Philippines'}
            </Text>
          </View>
        </View>

        {/* 2. SEGMENTED CONTROL: My Journey | Templates (Cleanly anchored under Header) */}
        <View style={styles.segmentedControlContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, !showTemplates && styles.segmentBtnActive]}
            onPress={() => setShowTemplates(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, !showTemplates && styles.segmentTextActive]}>
              My Journey
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, showTemplates && styles.segmentBtnActive]}
            onPress={() => setShowTemplates(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, showTemplates && styles.segmentTextActive]}>
              Templates
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. TEMPLATE EXPLORER OR TASK LIST */}
        {showTemplates ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Template Actions Row */}
            <View style={styles.templateActionsRow}>
              <TouchableOpacity style={styles.customTaskButton} onPress={() => router.push('/template-builder')} activeOpacity={0.8}>
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.customTaskButtonText}>Create your own template</Text>
              </TouchableOpacity>

              {/* My Roadmaps Icon Button */}
              <TouchableOpacity
                style={styles.myRoadmapsIconButton}
                onPress={() => setShowMyRoadmapsModal(true)}
                activeOpacity={0.8}
                accessibilityLabel="My Roadmaps"
              >
                <FolderKanban size={18} color={LikhoraColors.primary} />
                {savedRoadmaps.length > 0 && (
                  <View style={styles.myRoadmapsBadgeDot}>
                    <Text style={styles.myRoadmapsBadgeDotText}>{savedRoadmaps.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Saved Templates Bookmark Button */}
              <TouchableOpacity style={styles.myTemplatesButton} onPress={() => router.push('/my-templates')} activeOpacity={0.8}>
                <Bookmark size={18} color={LikhoraColors.primary} />
              </TouchableOpacity>
            </View>

            {/* Catalogue Section Header directly below action row */}
            <Text style={styles.sectionHeaderTitle}>Startup Roadmap Templates</Text>
            <Text style={styles.sectionSubTitle}>
              Ready-made launch plans built on real Philippine legal and business requirements — for
              your first business, or the next one.
            </Text>

            <View style={styles.templateSearchBox}>
              <Search size={15} color={LikhoraColors.textPlaceholder} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.templateSearchInput}
                placeholder="Search templates"
                placeholderTextColor={LikhoraColors.textPlaceholder}
                value={templateSearch}
                onChangeText={setTemplateSearch}
                returnKeyType="search"
              />
              {templateSearch.length > 0 && (
                <TouchableOpacity onPress={() => setTemplateSearch('')} hitSlop={10}>
                  <X size={15} color={LikhoraColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateChipRow}
            >
              <TouchableOpacity
                style={[styles.templateChip, !templateCategory && styles.templateChipSelected]}
                onPress={() => setTemplateCategory(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.templateChipText, !templateCategory && styles.templateChipTextSelected]}>
                  All {STARTUP_TEMPLATES.length}
                </Text>
              </TouchableOpacity>

              {TEMPLATE_CATEGORIES.map((category) => {
                const count = STARTUP_TEMPLATES.filter((t) => t.category === category).length;
                const selected = templateCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.templateChip, selected && styles.templateChipSelected]}
                    onPress={() => setTemplateCategory(selected ? null : category)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.templateChipText, selected && styles.templateChipTextSelected]}>
                      {category} {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {visibleTemplates.length === 0 ? (
              <View style={styles.templateEmpty}>
                <Text style={styles.templateEmptyTitle}>No templates match</Text>
                <Text style={styles.templateEmptyText}>
                  Try a different search, or clear the filters to see all {STARTUP_TEMPLATES.length}.
                </Text>
                <TouchableOpacity
                  style={styles.templateClearBtn}
                  onPress={() => {
                    setTemplateSearch('');
                    setTemplateCategory(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.templateClearText}>Clear filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              visibleTemplates.map((tmpl) => {
                const Icon = TEMPLATE_ICONS[tmpl.icon];
                const matchingSaved = savedRoadmaps.find(
                  (r) =>
                    r.title.toLowerCase() === tmpl.title.toLowerCase() ||
                    r.templateId === tmpl.title
                );
                const isAlreadyStarted = Boolean(matchingSaved);
                const isCurrentlyActive = matchingSaved?.id === activeRoadmapId;

                return (
                  <View key={tmpl.id} style={styles.templateCard}>
                    {/* A photo when one is bundled, otherwise an accent banner —
                        so a template without artwork still looks designed
                        rather than like a failed image load. */}
                    {tmpl.image ? (
                      <Image source={tmpl.image} style={styles.templateImage} contentFit="cover" transition={150} />
                    ) : (
                      <View style={[styles.templateBanner, { backgroundColor: tmpl.accent }]}>
                        <Icon size={30} color="#FFFFFF" />
                      </View>
                    )}

                    <View style={styles.templateBody}>
                      <View style={styles.templateCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.templateTitle}>{tmpl.title}</Text>
                          <Text style={styles.templateMeta}>
                            {tmpl.budget} • {tmpl.tasks.length} steps
                          </Text>
                        </View>
                        {isCurrentlyActive ? (
                          <View style={styles.activePillBadge}>
                            <Text style={styles.activePillBadgeText}>Active</Text>
                          </View>
                        ) : isAlreadyStarted ? (
                          <View style={styles.inProgressPillBadge}>
                            <Text style={styles.inProgressPillBadgeText}>In Progress</Text>
                          </View>
                        ) : (
                          <View style={styles.templateBadge}>
                            <Bookmark size={14} color={LikhoraColors.primary} />
                          </View>
                        )}
                      </View>

                      <Text style={styles.templateDesc}>{tmpl.desc}</Text>

                      {isCurrentlyActive ? (
                        <TouchableOpacity
                          style={styles.startTemplateBtn}
                          onPress={() => setShowTemplates(false)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.startTemplateBtnText}>Continue Active Journey</Text>
                          <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      ) : isAlreadyStarted && matchingSaved ? (
                        <TouchableOpacity
                          style={[styles.startTemplateBtn, { backgroundColor: '#5B2256' }]}
                          onPress={() => handleSwitchRoadmap(matchingSaved.id)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.startTemplateBtnText}>Resume Saved Roadmap</Text>
                          <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.startTemplateBtn}
                          onPress={() => handleStartTemplate(tmpl.title, tmpl.tasks)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.startTemplateBtnText}>Start This Roadmap</Text>
                          <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={LikhoraColors.primary} />
            <Text style={styles.loadingText}>Loading your custom legal roadmap...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Overall Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>

            {/* If 100% Completed, Show Completion Banner */}
            {progressPercent === 100 && (
              <View style={styles.completionBanner}>
                <Sparkles size={24} color={LikhoraColors.successGreen} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.completionTitle}>Roadmap Completed! 🎉</Text>
                  <Text style={styles.completionSub}>
                    Congratulations on completing your legal business launch checklist! Tap to compile your Business Portfolio from everything you've built.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.exploreBannerBtn}
                  onPress={() => router.push('/business-portfolio')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.exploreBannerBtnText}>View Portfolio</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Objective 4 / TC_PROGRESS_001: Next Step Recommendation Card */}
            {nextStep && !nextStep.allComplete && nextStep.task && progressPercent < 100 && (
              <TouchableOpacity
                style={styles.nextStepAiCard}
                onPress={() => setSelectedTaskModal(nextStep.task)}
                activeOpacity={0.85}
              >
                <View style={styles.nextStepAiHeader}>
                  <Sparkles size={14} color={LikhoraColors.aiBlue} style={{ marginRight: 6 }} />
                  <Text style={styles.nextStepAiTitle}>Khora AI • Recommended Next Step</Text>
                  {nextStep.source === 'khora-ai' && (
                    <View style={styles.liveAiBadge}>
                      <Text style={styles.liveAiBadgeText}>AI Guidance</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.nextStepTaskTitle}>{nextStep.task.title}</Text>
                {Boolean(nextStep.reason) && (
                  <Text style={styles.nextStepReasonText}>{nextStep.reason}</Text>
                )}
                <View style={styles.nextStepActionRow}>
                  <Text style={styles.nextStepActionText}>View task requirements & checklist</Text>
                  <ArrowRight size={13} color={LikhoraColors.primary} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            )}

            {/* Phase 3: AI Philippine Regulatory & Legal Compliance Advisor Banner */}
            <TouchableOpacity
              style={styles.regulatoryBannerCard}
              onPress={() => handleOpenRegulatoryAdvisor()}
              activeOpacity={0.85}
            >
              <View style={styles.regulatoryBannerIcon}>
                <Scale size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.regulatoryBadgeRow}>
                  <Text style={styles.regulatoryBadgeText}>PHILIPPINE REGULATORY AI</Text>
                  <View style={styles.govVerifiedPill}>
                    <ShieldCheck size={11} color={LikhoraColors.successGreen} style={{ marginRight: 3 }} />
                    <Text style={styles.govVerifiedText}>gov.ph verified</Text>
                  </View>
                </View>
                <Text style={styles.regulatoryBannerTitle}>
                  Industry Permits & Legal Protections
                </Text>
                <Text style={styles.regulatoryBannerSub} numberOfLines={1}>
                  FDA, DOH, BAI, PCAB • Senior/PWD 20% discounts • Price Tag Law
                </Text>
              </View>
              <ArrowRight size={18} color={LikhoraColors.primary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            {/* Guided step-by-step journey: all steps unlocked and accessible */}
            <View style={styles.stepperContainer}>
              {orderedTasks.map((rawTask, idx) => {
                const task = ensureSubSteps(rawTask);
                const taskIdKey = task.id || task.title || `task-${idx}`;
                const isCompleted = task.status === 'Completed';
                const isSkipped = task.status === 'Skipped';
                const isActive = idx === activeStepIndex;
                const isLast = idx === orderedTasks.length - 1;

                const subSteps = task.sub_steps || [];
                const completedSubSteps = subSteps.filter(s => s.completed).length;
                const subPercent = subSteps.length > 0 ? Math.round((completedSubSteps / subSteps.length) * 100) : 0;

                return (
                  <View key={taskIdKey} style={styles.stepRow}>
                    {/* Connector: dot + line down to the next step */}
                    <View style={styles.stepConnectorCol}>
                      <View
                        style={[
                          styles.stepDot,
                          isCompleted && styles.stepDotCompleted,
                          isSkipped && styles.stepDotSkipped,
                          isActive && styles.stepDotActive,
                        ]}
                      >
                        {isCompleted ? (
                          <Check size={14} color="#FFFFFF" strokeWidth={3} />
                        ) : isSkipped ? (
                          <SkipForward size={12} color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.stepDotNumber, isActive && styles.stepDotNumberActive]}>
                            {task.step_order || idx + 1}
                          </Text>
                        )}
                      </View>
                      {!isLast && (
                        <View style={[styles.stepConnectorLine, (isCompleted || isSkipped) && styles.stepConnectorLineDone]} />
                      )}
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1, paddingBottom: isLast ? 0 : Spacing.three }}>
                      {isActive ? (
                        <TouchableOpacity
                          style={styles.activeStepCard}
                          onPress={() => setSelectedTaskModal(task)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.activeStepEyebrow}>YOUR CURRENT STEP</Text>
                          <Text style={styles.activeStepTitle}>{task.title}</Text>
                          {task.desc ? (
                            <Text style={styles.activeStepDesc} numberOfLines={2}>{task.desc}</Text>
                          ) : null}

                          <View style={styles.cardMetaPillRow}>
                            {task.agency && (
                              <View style={styles.cardAgencyPill}>
                                <Building2 size={10} color={LikhoraColors.primary} style={{ marginRight: 3 }} />
                                <Text style={styles.cardAgencyPillText} numberOfLines={1}>{task.agency}</Text>
                              </View>
                            )}
                            {task.estimated_time && (
                              <View style={styles.cardTimePill}>
                                <Clock size={10} color={LikhoraColors.textSecondary} style={{ marginRight: 3 }} />
                                <Text style={styles.cardTimePillText}>{task.estimated_time}</Text>
                              </View>
                            )}
                          </View>

                          {subSteps.length > 0 && (
                            <View style={styles.subStepIndicatorRow}>
                              <Text style={styles.subStepIndicatorText}>
                                {completedSubSteps}/{subSteps.length} steps done
                              </Text>
                              <View style={styles.miniProgressTrack}>
                                <View style={[styles.miniProgressFill, { width: `${subPercent}%` }]} />
                              </View>
                            </View>
                          )}

                          <View style={styles.continueStepBtn}>
                            <Text style={styles.continueStepBtnText}>Continue this step</Text>
                            <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.compactStepRow,
                            isCompleted && styles.compactStepRowCompleted,
                            isSkipped && styles.compactStepRowSkipped,
                          ]}
                          onPress={() => setSelectedTaskModal(task)}
                          activeOpacity={0.75}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text
                              style={[
                                styles.compactStepTitle,
                                isCompleted && styles.compactStepTitleCompleted,
                                isSkipped && styles.compactStepTitleSkipped,
                              ]}
                              numberOfLines={1}
                            >
                              {task.title}
                            </Text>
                            {task.agency ? (
                              <Text style={styles.compactStepSubtitle} numberOfLines={1}>
                                {task.agency} {task.estimated_time ? `• ${task.estimated_time}` : ''}
                              </Text>
                            ) : null}
                          </View>
                          {isCompleted ? (
                            <View style={styles.doneBadgePill}>
                              <Check size={11} color="#059669" strokeWidth={3} style={{ marginRight: 3 }} />
                              <Text style={styles.compactStepTagDone}>Done</Text>
                            </View>
                          ) : isSkipped ? (
                            <View style={styles.skippedBadgePill}>
                              <Text style={styles.compactStepTagSkipped}>Skipped</Text>
                            </View>
                          ) : (
                            <View style={styles.openStepBadgePill}>
                              <Text style={styles.compactStepTagOpen}>Open</Text>
                              <ArrowRight size={11} color={LikhoraColors.primary} style={{ marginLeft: 3 }} />
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* REAL LEGAL PROCESS POP-UP MODAL WINDOW                             */}
        {/* ------------------------------------------------------------------ */}
        {selectedTaskModal && (
          <Modal
            visible={Boolean(selectedTaskModal)}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setSelectedTaskModal(null)}
          >
            <View style={styles.popupOverlay}>
              <View style={styles.popupContainer}>

                {/* Popup Header */}
                <View style={styles.popupHeader}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={styles.popupCategoryRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{selectedTaskModal.category}</Text>
                      </View>
                      <Text style={styles.popupStepOrder}>Step {selectedTaskModal.step_order || 1}</Text>
                      {selectedTaskModal.status === 'Skipped' && (
                        <View style={styles.skippedBadge}>
                          <Text style={styles.skippedBadgeText}>Skipped</Text>
                        </View>
                      )}
                      {selectedTaskModal.status === 'Completed' && (
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedBadgeText}>Completed</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.popupTitle}>{selectedTaskModal.title}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closePopupBtn}
                    onPress={() => setSelectedTaskModal(null)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={22} color={LikhoraColors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.popupScrollBody} showsVerticalScrollIndicator={false}>

                  {/* Beginner Guidance & Tips (TC_ROADMAP_001 & TC_SDG_001) */}
                  {selectedTaskModal.tips && selectedTaskModal.tips.length > 0 && (
                    <View style={styles.tipsBanner}>
                      <View style={styles.tipsHeaderRow}>
                        <Lightbulb size={16} color="#D97706" style={{ marginRight: 6 }} />
                        <Text style={styles.tipsTitle}>
                          {userProfile?.experience_level === 'First-time entrepreneur' ? 'Beginner Guidance & Tips' : 'Practical Tips'}
                        </Text>
                      </View>
                      {selectedTaskModal.tips.map((tip, tIdx) => (
                        <View key={tIdx} style={styles.tipItemRow}>
                          <Text style={styles.tipBullet}>•</Text>
                          <Text style={styles.tipText}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Official Legal Basis Card */}
                  {selectedTaskModal.legal_basis && (
                    <View style={styles.legalBasisBanner}>
                      <View style={styles.legalIconCircle}>
                        <Scale size={18} color={LikhoraColors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.legalTag}>PHILIPPINE LEGAL COMPLIANCE BASIS</Text>
                        <Text style={styles.legalText}>{selectedTaskModal.legal_basis}</Text>
                      </View>
                    </View>
                  )}

                  {/* Government Agency & Specs Bar */}
                  <View style={styles.specsGrid}>
                    {selectedTaskModal.agency && (
                      <View style={styles.specBox}>
                        <Building2 size={16} color={LikhoraColors.primary} style={{ marginBottom: 4 }} />
                        <Text style={styles.specLabel}>Government Agency</Text>
                        <Text style={styles.specValue}>{selectedTaskModal.agency}</Text>
                      </View>
                    )}

                    {selectedTaskModal.estimated_time && (
                      <View style={styles.specBox}>
                        <Clock size={16} color={LikhoraColors.aiBlue} style={{ marginBottom: 4 }} />
                        <Text style={styles.specLabel}>Est. Timeline</Text>
                        <Text style={styles.specValue}>{selectedTaskModal.estimated_time}</Text>
                      </View>
                    )}

                    {selectedTaskModal.estimated_cost && (
                      <View style={styles.specBox}>
                        <Coins size={16} color={LikhoraColors.successGreen} style={{ marginBottom: 4 }} />
                        <Text style={styles.specLabel}>Official Fees / Budget</Text>
                        <Text style={styles.specValue}>{selectedTaskModal.estimated_cost}</Text>
                      </View>
                    )}
                  </View>

                  {/* Required Documents Section */}
                  {selectedTaskModal.required_docs && selectedTaskModal.required_docs.length > 0 && (
                    <View style={styles.docsCardSection}>
                      <View style={styles.docsHeaderRow}>
                        <ShieldCheck size={16} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.docsSectionTitle}>Required Official Documents:</Text>
                      </View>
                      <View style={styles.docItemsList}>
                        {selectedTaskModal.required_docs.map((doc, dIdx) => (
                          <View key={dIdx} style={styles.docItemRow}>
                            <FileText size={14} color={LikhoraColors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.docItemText}>{doc}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Step-by-Step Actionable Legal Checklist */}
                  <Text style={styles.checklistHeaderTitle}>Actionable Legal Process Steps:</Text>
                  <Text style={styles.checklistSubTitle}>Check off each step as you complete it with the agency:</Text>

                  <View style={styles.popupChecklistContainer}>
                    {selectedTaskModal.sub_steps?.map((sub) => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.popupSubStepRow,
                          sub.completed && styles.popupSubStepRowCompleted,
                        ]}
                        onPress={() => toggleSubStep(selectedTaskModal, sub.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.popupCheckIcon}>
                          {sub.completed ? (
                            <CheckSquare size={20} color={LikhoraColors.successGreen} />
                          ) : (
                            <Square size={20} color={LikhoraColors.textPlaceholder} />
                          )}
                        </View>

                        <Text
                          style={[
                            styles.popupSubStepText,
                            sub.completed && styles.popupSubStepTextCompleted,
                          ]}
                        >
                          {sub.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Khora AI Response Box inside Pop-up Modal */}
                  {taskAiAdviceMap[selectedTaskModal.id || selectedTaskModal.title] ? (
                    <View style={styles.aiResponseCard}>
                      <View style={styles.aiResponseHeader}>
                        <Sparkles size={16} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.aiResponseTitle}>Khora AI Legal & Operational Advice</Text>
                      </View>
                      <Text style={styles.aiResponseBody}>
                        {taskAiAdviceMap[selectedTaskModal.id || selectedTaskModal.title]}
                      </Text>
                    </View>
                  ) : null}

                  {/* AI Assistance Action Button */}
                  <TouchableOpacity
                    style={styles.popupAiBtn}
                    onPress={() => handleGetTaskAiAdvice(selectedTaskModal)}
                    activeOpacity={0.8}
                  >
                    <Sparkles size={16} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.popupAiBtnText}>Chat with Khora AI for Legal Advice</Text>
                  </TouchableOpacity>

                </ScrollView>

                {/* Popup Footer Buttons */}
                <View style={styles.popupFooter}>
                  <View style={styles.popupFooterActions}>
                    <TouchableOpacity
                      style={[
                        styles.toggleCompleteBtn,
                        selectedTaskModal.status === 'Completed' && styles.toggleCompleteBtnActive
                      ]}
                      onPress={() => toggleTaskStatus(selectedTaskModal)}
                      activeOpacity={0.85}
                    >
                      <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.toggleCompleteBtnText}>
                        {selectedTaskModal.status === 'Completed' ? 'Step Completed ✓' : 'Mark Entire Step Complete'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.toggleSkipBtn,
                        selectedTaskModal.status === 'Skipped' && styles.toggleSkipBtnActive
                      ]}
                      onPress={() => toggleSkipTask(selectedTaskModal)}
                      activeOpacity={0.85}
                    >
                      <SkipForward size={14} color={selectedTaskModal.status === 'Skipped' ? '#B45309' : LikhoraColors.textSecondary} style={{ marginRight: 6 }} />
                      <Text
                        style={[
                          styles.toggleSkipBtnText,
                          selectedTaskModal.status === 'Skipped' && styles.toggleSkipBtnTextActive
                        ]}
                      >
                        {selectedTaskModal.status === 'Skipped' ? 'Unskip Step (Restore)' : 'Skip This Step'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.closeDoneBtn}
                    onPress={() => setSelectedTaskModal(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeDoneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          </Modal>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PHILIPPINE REGULATORY & LEGAL COMPLIANCE ADVISOR MODAL (PHASE 3)    */}
        {/* ------------------------------------------------------------------ */}
        <Modal
          visible={showRegulatoryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRegulatoryModal(false)}
        >
          <View style={styles.popupOverlay}>
            <View style={[styles.popupContainer, { maxHeight: '92%' }]}>
              {/* Header */}
              <View style={styles.regModalHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={styles.regHeaderPillRow}>
                    <View style={styles.regGovTag}>
                      <ShieldCheck size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.regGovTagText}>GOV.PH ARCHITECTED</Text>
                    </View>
                    <View style={styles.regAiPill}>
                      <Sparkles size={11} color={LikhoraColors.aiBlue} style={{ marginRight: 3 }} />
                      <Text style={styles.regAiPillText}>Khora AI Engine</Text>
                    </View>
                  </View>
                  <Text style={styles.regModalTitle}>Philippine Regulatory & Legal Hub</Text>
                  <Text style={styles.regModalSub}>
                    Dynamic compliance & legal framework for any Philippine business venture.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closePopupBtn}
                  onPress={() => setShowRegulatoryModal(false)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={22} color={LikhoraColors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.regScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Interactive Business Search & Quick Chips */}
                <View style={styles.regSearchSection}>
                  <Text style={styles.regSectionHeader}>TEST ANY BUSINESS TYPE</Text>
                  <Text style={styles.regSectionSub}>
                    Select an industry chip or type any custom business to simulate search across gov.ph portals:
                  </Text>

                  {/* Quick Chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.regChipsRow}
                  >
                    {[
                      { label: '💊 Pharmacy (FDA)', query: 'Pharmacy' },
                      { label: '💧 Water Refilling (DOH)', query: 'Water Refilling Station' },
                      { label: '🍲 Food Service (DOH)', query: 'Food Service / Carinderia' },
                      { label: '🐾 Pet Clinic (BAI)', query: 'Veterinary Clinic & Pet Grooming' },
                      { label: '🏗️ Contractor (PCAB)', query: 'Construction & Trade Contractor' },
                      { label: '🛒 Micro Retail (BMBE)', query: 'General Retail & Sari-Sari Store' },
                    ].map((item, idx) => {
                      const isSelected = regulatoryQuery.toLowerCase().includes(item.query.toLowerCase().split(' ')[0]);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.regChip, isSelected && styles.regChipActive]}
                          onPress={() => handleAnalyzeRegulatoryQuery(item.query)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.regChipText, isSelected && styles.regChipTextActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Search Input Bar */}
                  <View style={styles.regInputRow}>
                    <View style={styles.regInputWrap}>
                      <Search size={16} color={LikhoraColors.textPlaceholder} style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.regTextInput}
                        placeholder="Type any business (e.g. Laundry, Salon, Bakery)..."
                        placeholderTextColor={LikhoraColors.textPlaceholder}
                        value={regulatoryQuery}
                        onChangeText={setRegulatoryQuery}
                        onSubmitEditing={() => handleAnalyzeRegulatoryQuery()}
                        returnKeyType="search"
                      />
                      {regulatoryQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setRegulatoryQuery('')} hitSlop={8}>
                          <X size={14} color={LikhoraColors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.regSearchBtn}
                      onPress={() => handleAnalyzeRegulatoryQuery()}
                      disabled={isAnalyzingRegulatory}
                      activeOpacity={0.8}
                    >
                      {isAnalyzingRegulatory ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.regSearchBtnText}>Search gov.ph</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2. Loading State Animation */}
                {isAnalyzingRegulatory && (
                  <View style={styles.regLoadingBox}>
                    <ActivityIndicator size="large" color={LikhoraColors.primary} style={{ marginBottom: 10 }} />
                    <Text style={styles.regLoadingTitle}>Simulating Search on Official gov.ph Portals...</Text>
                    <Text style={styles.regLoadingText}>
                      Querying fda.gov.ph, doh.gov.ph, bai.da.gov.ph, ciap.dti.gov.ph...
                    </Text>
                    <Text style={styles.regLoadingSub}>
                      Formulating focused operational requirements & statutory legal considerations.
                    </Text>
                  </View>
                )}

                {/* 3. Regulatory Profile Results */}
                {!isAnalyzingRegulatory && analyzedRegulatoryProfile && (
                  <>
                    {/* Primary Regulatory License Hero Card */}
                    <View style={styles.regHeroCard}>
                      <View style={styles.regHeroTopRow}>
                        <View style={styles.regAgencyBadge}>
                          <Text style={styles.regAgencyBadgeText}>
                            {analyzedRegulatoryProfile.agencyAcronym}
                          </Text>
                        </View>
                        <View style={styles.regSourceTag}>
                          <Text style={styles.regSourceTagText}>
                            {analyzedRegulatoryProfile.source === 'khora-ai' ? 'Search-Architected AI' : 'Deterministic Registry'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.regLicenseName}>
                        {analyzedRegulatoryProfile.licenseName}
                      </Text>
                      <Text style={styles.regPrimaryAgency}>
                        Issuing Agency: {analyzedRegulatoryProfile.primaryAgency}
                      </Text>

                      <View style={styles.regLegalBasisBox}>
                        <Scale size={15} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.regLegalBasisText} numberOfLines={2}>
                          {analyzedRegulatoryProfile.legalBasis}
                        </Text>
                      </View>

                      <View style={styles.regSpecsRow}>
                        <View style={styles.regSpecItem}>
                          <Clock size={14} color={LikhoraColors.aiBlue} style={{ marginRight: 5 }} />
                          <Text style={styles.regSpecText}>{analyzedRegulatoryProfile.estimatedTime}</Text>
                        </View>
                        <View style={styles.regSpecItem}>
                          <Coins size={14} color={LikhoraColors.successGreen} style={{ marginRight: 5 }} />
                          <Text style={styles.regSpecText}>{analyzedRegulatoryProfile.estimatedCost}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Sharply Focused Requirements Section */}
                    <View style={styles.regSectionCard}>
                      <View style={styles.regCardHeaderRow}>
                        <ShieldCheck size={18} color={LikhoraColors.primary} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.regCardHeaderTitle}>Sharply Focused Requirements</Text>
                          <Text style={styles.regCardHeaderSub}>
                            Technical, equipment, personnel, and logbook criteria:
                          </Text>
                        </View>
                      </View>

                      {analyzedRegulatoryProfile.focusedRequirements.map((req, rIdx) => (
                        <View key={rIdx} style={styles.regReqItem}>
                          <View style={styles.regReqHeader}>
                            <View style={styles.regReqDot} />
                            <Text style={styles.regReqTitle}>{req.title}</Text>
                            {req.isMandatory && (
                              <View style={styles.mandatoryPill}>
                                <Text style={styles.mandatoryPillText}>MANDATORY</Text>
                              </View>
                            )}
                            {req.documentCode && (
                              <View style={styles.docCodePill}>
                                <Text style={styles.docCodePillText}>{req.documentCode}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.regReqDesc}>{req.description}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Statutory Philippine Legal Considerations */}
                    <View style={styles.regSectionCard}>
                      <View style={styles.regCardHeaderRow}>
                        <Scale size={18} color="#D97706" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.regCardHeaderTitle}>Statutory Legal Protections & Liabilities</Text>
                          <Text style={styles.regCardHeaderSub}>
                            Mandatory Philippine laws, statutory discounts, and price controls:
                          </Text>
                        </View>
                      </View>

                      {/* Mandatory Discounts Box */}
                      {analyzedRegulatoryProfile.mandatoryDiscountsApplicable.length > 0 && (
                        <View style={styles.discountHighlightBox}>
                          <Text style={styles.discountHighlightTitle}>
                            MANDATORY STATUTORY DISCOUNTS & PRICE DISPLAY
                          </Text>
                          {analyzedRegulatoryProfile.mandatoryDiscountsApplicable.map((disc, dIdx) => (
                            <View key={dIdx} style={styles.discountRow}>
                              <CheckCircle2 size={13} color={LikhoraColors.successGreen} style={{ marginRight: 6 }} />
                              <Text style={styles.discountText}>{disc}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Legal Considerations Cards */}
                      {analyzedRegulatoryProfile.legalConsiderations.map((leg, lIdx) => (
                        <View key={lIdx} style={styles.legalItemCard}>
                          <View style={styles.legalItemTop}>
                            <Text style={styles.legalItemTitle}>{leg.title}</Text>
                            <View style={styles.lawCodeBadge}>
                              <Text style={styles.lawCodeBadgeText}>{leg.law}</Text>
                            </View>
                          </View>
                          <Text style={styles.legalItemSummary}>{leg.summary}</Text>
                          <View style={styles.liabilityBox}>
                            <AlertTriangle size={13} color="#B45309" style={{ marginRight: 5, marginTop: 1 }} />
                            <Text style={styles.liabilityText}>
                              <Text style={{ fontWeight: '800' }}>Liability: </Text>
                              {leg.penaltyOrLiability}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* JSON Exchange Inspector ("Everytime user json file to ai and ai five to user") */}
                    <View style={styles.jsonSectionCard}>
                      <TouchableOpacity
                        style={styles.jsonToggleBtn}
                        onPress={() => setShowJsonExchange(!showJsonExchange)}
                        activeOpacity={0.8}
                      >
                        <Code size={16} color={LikhoraColors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.jsonToggleBtnText}>
                          {showJsonExchange ? 'Hide Raw JSON Exchange' : 'Inspect Raw JSON Exchange (User ⇄ AI)'}
                        </Text>
                        {showJsonExchange ? (
                          <ChevronUp size={16} color={LikhoraColors.textSecondary} />
                        ) : (
                          <ChevronDown size={16} color={LikhoraColors.textSecondary} />
                        )}
                      </TouchableOpacity>

                      {showJsonExchange && (
                        <View style={styles.jsonBoxContainer}>
                          <Text style={styles.jsonBoxLabel}>📤 1. USER JSON PAYLOAD TO AI</Text>
                          <View style={styles.jsonTerminal}>
                            <Text style={styles.jsonTerminalText}>{sentJsonPayload || '{}'}</Text>
                          </View>

                          <Text style={[styles.jsonBoxLabel, { marginTop: 12 }]}>
                            📥 2. AI 5-PART STRUCTURED JSON RESPONSE TO USER
                          </Text>
                          <View style={styles.jsonTerminal}>
                            <Text style={styles.jsonTerminalText}>{receivedJsonPayload || '{}'}</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* CTA: Apply to My Roadmap */}
                    <TouchableOpacity
                      style={styles.applyRoadmapBtn}
                      onPress={handleApplyRegulatoryToRoadmap}
                      activeOpacity={0.85}
                    >
                      <Plus size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.applyRoadmapBtnText}>
                        Apply {analyzedRegulatoryProfile.agencyAcronym} Permit to My Roadmap
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ------------------------------------------------------------------ */}
        {/* MY SAVED ROADMAPS SWITCHER MODAL                                   */}
        {/* ------------------------------------------------------------------ */}
        <Modal
          visible={showMyRoadmapsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowMyRoadmapsModal(false)}
        >
          <View style={styles.popupOverlay}>
            <View style={[styles.popupContainer, { maxHeight: '88%' }]}>
              {/* Header */}
              <View style={styles.myRoadmapsModalHeader}>
                <View style={styles.myRoadmapsHeaderIconWrap}>
                  <FolderKanban size={20} color={LikhoraColors.primary} />
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.myRoadmapsModalTitle}>My Roadmaps</Text>
                    <View style={styles.savedRoadmapsCountBadge}>
                      <Text style={styles.savedRoadmapsCountText}>
                        {savedRoadmaps.length} Plan{savedRoadmaps.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.myRoadmapsModalSub}>
                    Switch between your active and saved business journeys. All progress is preserved.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closePopupBtn}
                  onPress={() => setShowMyRoadmapsModal(false)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={LikhoraColors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Scrollable list of roadmaps */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: Spacing.three }}
              >
                {savedRoadmaps.map((sRoadmap) => {
                  const isActive = sRoadmap.id === activeRoadmapId;
                  const stats = getRoadmapProgress(isActive ? tasks : sRoadmap.tasks);

                  return (
                    <View
                      key={sRoadmap.id}
                      style={[
                        styles.savedRoadmapCard,
                        isActive && styles.savedRoadmapCardActive,
                      ]}
                    >
                      <View style={styles.savedRoadmapCardTop}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={styles.savedRoadmapBadgeRow}>
                            {isActive ? (
                              <View style={styles.activePlanBadge}>
                                <View style={styles.activePlanPulse} />
                                <Text style={styles.activePlanBadgeText}>Active Journey</Text>
                              </View>
                            ) : (
                              <View style={styles.savedPlanBadge}>
                                <Text style={styles.savedPlanBadgeText}>Saved Plan</Text>
                              </View>
                            )}
                            {sRoadmap.businessType || sRoadmap.category ? (
                              <View style={styles.categoryPill}>
                                <Text style={styles.categoryPillText}>
                                  {sRoadmap.businessType || sRoadmap.category}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.savedRoadmapTitle} numberOfLines={1}>
                            {sRoadmap.title}
                          </Text>
                          <Text style={styles.savedRoadmapMeta}>
                            {stats.completed} of {stats.effectiveTotal} steps completed • {stats.percent}% Done
                          </Text>
                        </View>

                        {savedRoadmaps.length > 1 && (
                          <TouchableOpacity
                            style={styles.deleteRoadmapBtn}
                            onPress={() => handleDeleteRoadmap(sRoadmap)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={15} color={LikhoraColors.textPlaceholder} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Mini Progress Track */}
                      <View style={styles.savedRoadmapProgressTrack}>
                        <View
                          style={[
                            styles.savedRoadmapProgressFill,
                            {
                              width: `${stats.percent}%`,
                              backgroundColor: isActive ? LikhoraColors.primary : '#10B981',
                            },
                          ]}
                        />
                      </View>

                      {/* Action Button */}
                      {isActive ? (
                        <TouchableOpacity
                          style={styles.continueJourneyBtn}
                          onPress={() => {
                            setShowMyRoadmapsModal(false);
                            setShowTemplates(false);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.continueJourneyBtnText}>Continue Active Journey</Text>
                          <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.switchRoadmapBtn}
                          onPress={() => {
                            setShowMyRoadmapsModal(false);
                            handleSwitchRoadmap(sRoadmap.id);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.switchRoadmapBtnText}>Switch & Resume This Roadmap</Text>
                          <ArrowRight size={14} color={LikhoraColors.primary} style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  templateActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  customTaskButton: {
    flex: 1,
    backgroundColor: LikhoraColors.primary,
    borderRadius: Radius.pill,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    shadowColor: LikhoraColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  myRoadmapsIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6F3F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6DEE8',
    position: 'relative',
  },
  myRoadmapsBadgeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  myRoadmapsBadgeDotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: LikhoraFont.fontFamily,
  },
  myTemplatesButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6F3F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6DEE8',
  },
  customTaskButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    fontFamily: LikhoraFont.fontFamily,
  },
  myRoadmapsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: LikhoraColors.border,
  },
  myRoadmapsHeaderIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LikhoraColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  myRoadmapsModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  myRoadmapsModalSub: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
    marginTop: 2,
    lineHeight: 16,
  },
  // My Roadmaps section
  savedRoadmapsSection: {
    marginBottom: Spacing.four,
  },
  savedRoadmapsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  savedRoadmapsCountBadge: {
    backgroundColor: LikhoraColors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    marginTop: 2,
  },
  savedRoadmapsCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  savedRoadmapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  savedRoadmapCardActive: {
    borderColor: LikhoraColors.primary,
    shadowColor: LikhoraColors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  savedRoadmapCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  savedRoadmapBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  activePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  activePlanPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  activePlanBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  savedPlanBadge: {
    backgroundColor: '#F3EBF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  savedPlanBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  categoryPill: {
    backgroundColor: LikhoraColors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  categoryPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  savedRoadmapTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 2,
  },
  savedRoadmapMeta: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    fontWeight: '600',
    fontFamily: LikhoraFont.fontFamily,
  },
  deleteRoadmapBtn: {
    padding: 6,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.inputBackground,
  },
  savedRoadmapProgressTrack: {
    height: 6,
    backgroundColor: '#F0ECF2',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 12,
  },
  savedRoadmapProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  continueJourneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.primary,
    paddingVertical: 10,
    borderRadius: Radius.medium,
  },
  continueJourneyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  switchRoadmapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.secondaryLavender,
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
    paddingVertical: 10,
    borderRadius: Radius.medium,
  },
  switchRoadmapBtnText: {
    color: LikhoraColors.primary,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  activePillBadge: {
    backgroundColor: LikhoraColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  activePillBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  inProgressPillBadge: {
    backgroundColor: LikhoraColors.secondaryLavender,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
  },
  inProgressPillBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  // -----------------------------------------------------------------------
  // Guided sequential stepper (My Journey view)
  // -----------------------------------------------------------------------
  stepperContainer: {
    marginTop: Spacing.two,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepConnectorCol: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: LikhoraColors.inputBackground,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: LikhoraColors.successGreen,
    borderColor: LikhoraColors.successGreen,
  },
  stepDotActive: {
    backgroundColor: LikhoraColors.primary,
    borderColor: LikhoraColors.primary,
  },
  stepDotNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  stepConnectorLine: {
    flex: 1,
    width: 2,
    minHeight: 20,
    backgroundColor: LikhoraColors.border,
    marginTop: 4,
  },
  stepConnectorLineDone: {
    backgroundColor: LikhoraColors.successGreen,
  },
  // Compact row — used for completed and locked steps, kept deliberately
  // plain (one line) so the screen isn't crowded with detail all at once.
  compactStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: '#ECE6EE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 52,
  },
  compactStepRowCompleted: {
    backgroundColor: '#F8FAF8',
    borderColor: '#D1FAE5',
  },
  compactStepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  compactStepSubtitle: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  compactStepTitleCompleted: {
    color: LikhoraColors.textSecondary,
    textDecorationLine: 'line-through',
  },
  compactStepTagDone: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    fontFamily: LikhoraFont.fontFamily,
  },
  compactStepTagOpen: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  doneBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  skippedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  openStepBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EBF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  stepDotNumberActive: {
    color: '#FFFFFF',
  },
  // The one fully-expanded card — always the step the user should be
  // working on right now.
  activeStepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    borderWidth: 2,
    borderColor: LikhoraColors.primary,
    shadowColor: LikhoraColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  activeStepEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: LikhoraColors.primary,
    letterSpacing: 0.5,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  activeStepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  activeStepDesc: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  continueStepBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueStepBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  // Locked-step preview banner (inside the detail modal)
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  lockedBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  popupSubStepRowLocked: {
    opacity: 0.55,
  },
  popupSubStepTextLocked: {
    color: LikhoraColors.textPlaceholder,
  },
  lockedFooterHint: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.pill,
  },
  lockedFooterHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  safeArea: {
    flex: 1,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
  container: {
    flex: 1,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
  topHeaderSection: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  topNotifBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  headerTitleRow: {
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  headerSub: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  notifIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LikhoraColors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  unreadDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: LikhoraColors.errorRed,
  },
  progressPill: {
    backgroundColor: LikhoraColors.successGreenSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  progressPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.successGreen,
    fontFamily: LikhoraFont.fontFamily,
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#E9E4EC',
    width: '100%',
    marginBottom: Spacing.two,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: LikhoraColors.successGreen,
  },
  nextStepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.primarySoft,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  nextStepCardDone: {
    backgroundColor: LikhoraColors.successGreenSoft,
    borderColor: '#A7F3D0',
  },
  nextStepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
  },
  nextStepIconWrapDone: {
    backgroundColor: LikhoraColors.successGreen,
  },
  nextStepLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: LikhoraColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: LikhoraFont.fontFamily,
  },
  nextStepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  nextStepReason: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    backgroundColor: '#F6F3F7',
    borderWidth: 1,
    borderColor: '#E6DEE8',
    borderRadius: 14,
    padding: 3,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    marginTop: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: '#42143E',
    shadowColor: '#42143E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E5D70',
    fontFamily: LikhoraFont.fontFamily,
  },
  segmentTextActive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  categoryFilterRow: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: LikhoraColors.inputBackground,
  },
  filterChipActive: {
    backgroundColor: LikhoraColors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
    marginTop: 10,
    fontFamily: LikhoraFont.fontFamily,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: 110,
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.successGreen,
    fontFamily: LikhoraFont.fontFamily,
  },
  completionSub: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  exploreBannerBtn: {
    backgroundColor: LikhoraColors.successGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    marginLeft: 8,
  },
  exploreBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  sectionSubTitle: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    marginBottom: Spacing.three,
    fontFamily: LikhoraFont.fontFamily,
  },
  templateSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    paddingHorizontal: 14,
    height: 42,
    marginBottom: 10,
  },
  templateSearchInput: {
    flex: 1,
    fontSize: 13,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    padding: 0,
  },
  templateChipRow: { gap: 6, paddingVertical: 4, paddingRight: Spacing.four, marginBottom: Spacing.three },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  templateChipSelected: { backgroundColor: LikhoraColors.primary, borderColor: LikhoraColors.primary },
  templateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  templateChipTextSelected: { color: '#FFFFFF' },

  templateEmpty: { alignItems: 'center', paddingVertical: Spacing.five },
  templateEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  templateEmptyText: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.three,
    fontFamily: LikhoraFont.fontFamily,
  },
  templateClearBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    backgroundColor: '#FFFFFF',
  },
  templateClearText: {
    fontSize: 12,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },

  templateCard: {
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.xlarge,
    marginBottom: Spacing.three,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    overflow: 'hidden',
  },
  templateImage: { width: '100%', height: 130 },
  templateBanner: { width: '100%', height: 90, alignItems: 'center', justifyContent: 'center' },
  templateBody: { padding: Spacing.four },
  templateCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  templateMeta: {
    fontSize: 12,
    color: LikhoraColors.primary,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  templateBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LikhoraColors.secondaryLavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateDesc: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
    fontFamily: LikhoraFont.fontFamily,
  },
  startTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.primary,
    paddingVertical: 10,
    borderRadius: Radius.large,
  },
  startTemplateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
  },
  taskCardCompleted: {
    backgroundColor: LikhoraColors.successGreenSoft,
    borderColor: '#A7F3D0',
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxBtn: {
    paddingTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  completedBadge: {
    backgroundColor: LikhoraColors.successGreenSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedBadgeText: {
    color: LikhoraColors.successGreen,
  },
  inProgressBadge: {
    backgroundColor: LikhoraColors.highlightYellowSoft,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inProgressBadgeText: {
    color: '#B45309',
  },
  stepOrderText: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.textPlaceholder,
    fontFamily: LikhoraFont.fontFamily,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: LikhoraColors.textSecondary,
  },
  taskDesc: {
    fontSize: 12.5,
    color: LikhoraColors.textSecondary,
    lineHeight: 17,
    fontFamily: LikhoraFont.fontFamily,
  },
  cardMetaPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  cardAgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  cardAgencyPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  cardTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  cardTimePillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  subStepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  subStepIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  miniProgressTrack: {
    width: 50,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: LikhoraColors.primary,
  },
  viewDetailBtn: {
    paddingLeft: 6,
    paddingTop: 2,
  },
  cardFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: LikhoraColors.border,
  },
  openPopupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.secondaryLavender,
    paddingVertical: 7,
    borderRadius: Radius.medium,
  },
  openPopupBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },

  /* POP-UP MODAL STYLES */
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  popupContainer: {
    height: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xlarge,
    borderTopRightRadius: Radius.xlarge,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: LikhoraColors.border,
  },
  popupCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  popupStepOrder: {
    fontSize: 11,
    fontWeight: '700',
    color: LikhoraColors.textPlaceholder,
    marginLeft: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    lineHeight: 24,
    fontFamily: LikhoraFont.fontFamily,
  },
  closePopupBtn: {
    padding: 4,
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.pill,
  },
  popupScrollBody: {
    paddingVertical: Spacing.four,
    paddingBottom: 20,
  },
  legalBasisBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.secondaryLavender,
    padding: Spacing.three,
    borderRadius: Radius.large,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
  },
  legalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  legalTag: {
    fontSize: 10,
    fontWeight: '800',
    color: LikhoraColors.primary,
    letterSpacing: 0.5,
    fontFamily: LikhoraFont.fontFamily,
  },
  legalText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.three,
  },
  specBox: {
    flex: 1,
    backgroundColor: LikhoraColors.inputBackground,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: LikhoraColors.textSecondary,
    marginBottom: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  specValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  docsCardSection: {
    backgroundColor: LikhoraColors.primarySoft,
    padding: Spacing.three,
    borderRadius: Radius.large,
    marginBottom: Spacing.four,
  },
  docsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  docsSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  docItemsList: {
    gap: 6,
  },
  docItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
  },
  docItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: LikhoraColors.textPrimary,
    flex: 1,
    fontFamily: LikhoraFont.fontFamily,
  },
  checklistHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    marginBottom: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  checklistSubTitle: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    marginBottom: 10,
    fontFamily: LikhoraFont.fontFamily,
  },
  popupChecklistContainer: {
    gap: 8,
    marginBottom: 16,
  },
  popupSubStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  popupSubStepRowCompleted: {
    backgroundColor: LikhoraColors.successGreenSoft,
    borderColor: '#A7F3D0',
  },
  popupCheckIcon: {
    marginRight: 10,
  },
  popupSubStepText: {
    fontSize: 13,
    fontWeight: '600',
    color: LikhoraColors.textPrimary,
    flex: 1,
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  popupSubStepTextCompleted: {
    textDecorationLine: 'line-through',
    color: LikhoraColors.textSecondary,
  },
  aiResponseCard: {
    backgroundColor: LikhoraColors.primarySoft,
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
  },
  aiResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiResponseTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  aiResponseBody: {
    fontSize: 13,
    color: LikhoraColors.textPrimary,
    lineHeight: 20,
    fontFamily: LikhoraFont.fontFamily,
  },
  popupAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.secondaryLavender,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
    marginBottom: 10,
  },
  popupAiBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  popupFooter: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: LikhoraColors.border,
  },
  popupFooterActions: {
    flex: 2,
    gap: 8,
  },
  toggleCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.primary,
    paddingVertical: 12,
    borderRadius: Radius.large,
  },
  toggleCompleteBtnActive: {
    backgroundColor: LikhoraColors.successGreen,
  },
  toggleCompleteBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  toggleSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.inputBackground,
    paddingVertical: 10,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  toggleSkipBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  toggleSkipBtnText: {
    color: LikhoraColors.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },
  toggleSkipBtnTextActive: {
    color: '#B45309',
  },
  closeDoneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LikhoraColors.inputBackground,
    paddingVertical: 12,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  closeDoneBtnText: {
    color: LikhoraColors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },
  stepDotSkipped: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  compactStepRowSkipped: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  compactStepTitleSkipped: {
    color: '#92400E',
    fontStyle: 'italic',
  },
  compactStepTagSkipped: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    fontFamily: LikhoraFont.fontFamily,
  },
  skippedBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  skippedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    fontFamily: LikhoraFont.fontFamily,
  },
  tipsBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  tipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    fontFamily: LikhoraFont.fontFamily,
  },
  tipItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  tipBullet: {
    fontSize: 14,
    color: '#D97706',
    marginRight: 6,
    lineHeight: 18,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#78350F',
    fontFamily: LikhoraFont.fontFamily,
  },
  regulatoryBannerCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  regulatoryBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regulatoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  regulatoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: LikhoraColors.primary,
    letterSpacing: 0.5,
    fontFamily: LikhoraFont.fontFamily,
    marginRight: 6,
  },
  govVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  govVerifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    fontFamily: LikhoraFont.fontFamily,
  },
  regulatoryBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  regulatoryBannerSub: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
    marginTop: 1,
  },
  regModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: LikhoraColors.border,
  },
  regHeaderPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  regGovTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    marginRight: 6,
  },
  regGovTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    fontFamily: LikhoraFont.fontFamily,
  },
  regAiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  regAiPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: LikhoraColors.aiBlue,
    fontFamily: LikhoraFont.fontFamily,
  },
  regModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  regModalSub: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
    marginTop: 2,
  },
  regScrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  regSearchSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  regSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: LikhoraColors.primary,
    letterSpacing: 0.5,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 2,
  },
  regSectionSub: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 10,
  },
  regChipsRow: {
    paddingBottom: 8,
    gap: 6,
  },
  regChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  regChipActive: {
    backgroundColor: LikhoraColors.primary,
    borderColor: LikhoraColors.primary,
  },
  regChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  regChipTextActive: {
    color: '#FFFFFF',
  },
  regInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  regInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.medium,
    paddingHorizontal: 10,
    height: 40,
  },
  regTextInput: {
    flex: 1,
    fontSize: 13,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    paddingVertical: 0,
  },
  regSearchBtn: {
    backgroundColor: LikhoraColors.primary,
    borderRadius: Radius.medium,
    paddingHorizontal: 14,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regSearchBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  regLoadingBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: Radius.large,
    padding: Spacing.four,
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  regLoadingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
    fontFamily: LikhoraFont.fontFamily,
    textAlign: 'center',
  },
  regLoadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    fontFamily: LikhoraFont.fontFamily,
    marginTop: 4,
    textAlign: 'center',
  },
  regLoadingSub: {
    fontSize: 11,
    color: '#075985',
    fontFamily: LikhoraFont.fontFamily,
    marginTop: 2,
    textAlign: 'center',
  },
  regHeroCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: LikhoraColors.primary,
    borderRadius: Radius.large,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    shadowColor: LikhoraColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  regHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  regAgencyBadge: {
    backgroundColor: LikhoraColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  regAgencyBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    fontFamily: LikhoraFont.fontFamily,
  },
  regSourceTag: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  regSourceTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    fontFamily: LikhoraFont.fontFamily,
  },
  regLicenseName: {
    fontSize: 17,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 22,
  },
  regPrimaryAgency: {
    fontSize: 13,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
    marginTop: 4,
  },
  regLegalBasisBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: Radius.medium,
    padding: 10,
    marginTop: 10,
  },
  regLegalBasisText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 16,
  },
  regSpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  regSpecItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regSpecText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  regSectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    borderRadius: Radius.large,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  regCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  regCardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  regCardHeaderSub: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
    marginTop: 1,
  },
  regReqItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.medium,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  regReqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  regReqDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LikhoraColors.primary,
  },
  regReqTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  mandatoryPill: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  mandatoryPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
    fontFamily: LikhoraFont.fontFamily,
  },
  docCodePill: {
    backgroundColor: '#E0E7FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  docCodePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4338CA',
    fontFamily: LikhoraFont.fontFamily,
  },
  regReqDesc: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 17,
  },
  discountHighlightBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: Radius.medium,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  discountHighlightTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 6,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    fontFamily: LikhoraFont.fontFamily,
  },
  legalItemCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: Radius.medium,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  legalItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  legalItemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    fontFamily: LikhoraFont.fontFamily,
    paddingRight: 6,
  },
  lawCodeBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  lawCodeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    fontFamily: LikhoraFont.fontFamily,
  },
  legalItemSummary: {
    fontSize: 12,
    color: '#78350F',
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 17,
  },
  liabilityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Radius.small,
    padding: 6,
    marginTop: 6,
  },
  liabilityText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 15,
  },
  jsonSectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  jsonToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  jsonToggleBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#93C5FD',
    fontFamily: LikhoraFont.fontFamily,
  },
  jsonBoxContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  jsonBoxLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 0.5,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 4,
  },
  jsonTerminal: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: Radius.medium,
    padding: 10,
    maxHeight: 180,
  },
  jsonTerminalText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#A7F3D0',
    lineHeight: 14,
  },
  applyRoadmapBtn: {
    backgroundColor: LikhoraColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.large,
    marginTop: 4,
    shadowColor: LikhoraColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  applyRoadmapBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  nextStepAiCard: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: Radius.large,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  nextStepAiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  nextStepAiTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
    flex: 1,
  },
  liveAiBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
  },
  liveAiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
  nextStepTaskTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    marginBottom: 4,
  },
  nextStepReasonText: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 18,
    marginBottom: 8,
  },
  nextStepActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextStepActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.primary,
    fontFamily: LikhoraFont.fontFamily,
  },
});

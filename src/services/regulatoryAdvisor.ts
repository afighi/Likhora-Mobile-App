/**
 * Khora AI Philippine Regulatory & Legal Compliance Advisor (Objective 3 & Phase 3)
 *
 * Implements search-architected prompt engineering and structured JSON exchange
 * to discover sharply focused, industry-specific Philippine regulatory requirements
 * (e.g. FDA for pharmacy/drugs/cosmetics, DOH for health/water, BAI for veterinary,
 * PCAB for contractors, DSWD for childcare, etc.) and vital legal considerations
 * (RA 9994/RA 10754 Senior/PWD discounts, RA 7581 Price Act, RA 7394 Consumer Act).
 *
 * Fully dynamic: Works for Pharmacy, Food, Water, Veterinary, Construction,
 * Retail, or ANY custom business entered by the user.
 */

import { askKhoraAI } from './claude';
import { extractJsonObject, cleanText } from '@/utils/json';

export interface RegulatoryRequirement {
  title: string;
  description: string;
  isMandatory: boolean;
  documentCode?: string;
}

export interface LegalConsideration {
  title: string;
  law: string;
  summary: string;
  penaltyOrLiability: string;
}

export interface RegulatoryProfile {
  businessType: string;
  primaryAgency: string;
  agencyAcronym: string;
  licenseName: string;
  legalBasis: string;
  estimatedTime: string;
  estimatedCost: string;
  focusedRequirements: RegulatoryRequirement[];
  legalConsiderations: LegalConsideration[];
  mandatoryDiscountsApplicable: string[];
  roadmapTask: {
    title: string;
    desc: string;
    category: 'Permits' | 'Legal' | 'Compliance';
    agency: string;
    legal_basis: string;
    estimated_time: string;
    estimated_cost: string;
    required_docs: string[];
    sub_steps: { id: string; title: string; completed: boolean }[];
  };
  source: 'khora-ai' | 'registry';
}

export interface AnalyzeRegulatoryRequest {
  businessType: string;
  businessName?: string;
  location?: string;
  category?: string;
  startingBudget?: string;
  registrationType?: string;
  isProductBased?: boolean;
}

// ---------------------------------------------------------------------------
// 1. Comprehensive Deterministic Philippine Regulatory Registry
// Guarantees immediate zero-lag loading and robust offline fallback
// ---------------------------------------------------------------------------
const PHILIPPINE_REGULATORY_REGISTRY: Record<string, Omit<RegulatoryProfile, 'source'>> = {
  pharmacy: {
    businessType: 'Pharmacy / Drugstore / Botika',
    primaryAgency: 'Food and Drug Administration (FDA Philippines)',
    agencyAcronym: 'FDA',
    licenseName: 'FDA License to Operate (LTO) as Retail Drug Outlet',
    legalBasis: 'RA 10918 (Philippine Pharmacy Act) & RA 9711 (FDA Act of 2009)',
    estimatedTime: '15 - 30 Business Days',
    estimatedCost: '₱2,000 - ₱5,000',
    focusedRequirements: [
      {
        title: 'PRC Registered Supervising Pharmacist',
        description: 'Valid PRC ID, Certificate of Registration, Pharmacist-Owner Employment Agreement, and FDA Good Storage Practice (GSP) training certificate.',
        isMandatory: true,
        documentCode: 'PRC-RPh',
      },
      {
        title: 'Dedicated Pharmaceutical Refrigerator with Thermometer Log',
        description: 'Cold-chain storage maintaining 2°C to 8°C for heat-sensitive medicines, insulin, and vaccines with twice-daily temperature logs.',
        isMandatory: true,
      },
      {
        title: 'Official Prescription & Dispensing Logbooks',
        description: 'FDA-registered Prescription Book, Senior Citizen/PWD Sales Record Book, and latest copy of the Philippine National Drug Formulary (PNDF).',
        isMandatory: true,
        documentCode: 'FDA-LOG',
      },
      {
        title: 'Physical Dispensing Counter & Security Separation',
        description: 'Clearly partitioned prescription (Rx) storage inaccessible to unauthorized customers, with sanitary handwashing sink nearby.',
        isMandatory: true,
      },
    ],
    legalConsiderations: [
      {
        title: 'Mandatory 20% Senior Citizen & PWD Discount + 12% VAT Exemption',
        law: 'RA 9994 (Expanded Senior Citizens Act) & RA 10754 (PWD Act)',
        summary: 'Pharmacies must grant an outright 20% discount and 12% VAT exemption on all essential medicines and generic prescriptions upon presentation of valid ID and Purchase Booklet.',
        penaltyOrLiability: 'Fines from ₱50,000 to ₱200,000 and revocation of business permit / FDA LTO for non-compliance.',
      },
      {
        title: 'Generics Act Compliance & Mandatory Drug Informing',
        law: 'RA 6675 (Generics Act of 1988)',
        summary: 'Pharmacists are legally required to inform customers of all available generic equivalents and their prices before dispensing branded items.',
        penaltyOrLiability: 'Suspension of professional license and administrative FDA sanctions.',
      },
      {
        title: 'Automatic Drug Price Freeze During State of Calamity',
        law: 'RA 7581 (Price Act)',
        summary: 'Prices of essential medicines are strictly frozen at prevailing market rates upon declaration of a state of calamity by LGU or National Government.',
        penaltyOrLiability: 'Up to ₱1,000,000 in fines and 10 years imprisonment for illegal price manipulation or price gouging.',
      },
    ],
    mandatoryDiscountsApplicable: [
      '20% Senior Citizen Discount (RA 9994) + 12% VAT Exemption',
      '20% PWD Discount (RA 10754) + 12% VAT Exemption',
      'Mandatory Generic Equivalent Information (RA 6675)',
    ],
    roadmapTask: {
      title: 'FDA License to Operate (LTO) Application',
      desc: 'Mandatory Food and Drug Administration permit authorizing the commercial storage and retail dispensing of medicines.',
      category: 'Permits',
      agency: 'Food and Drug Administration (FDA eServices)',
      legal_basis: 'RA 10918 (Philippine Pharmacy Act) & RA 9711',
      estimated_time: '15 - 30 Business Days',
      estimated_cost: '₱2,000 - ₱5,000',
      required_docs: [
        'PRC Pharmacist License & Notarized Agreement',
        'FDA eServices Application Form',
        'Store Floor Plan & Vicinity Map',
        'Refrigerator & Thermometer Calibration Proof',
        'Philippine National Drug Formulary (PNDF)',
      ],
      sub_steps: [
        { id: 'fda-1', title: 'Contract PRC Registered Pharmacist and notarize Pharmacist-Owner Agreement', completed: false },
        { id: 'fda-2', title: 'Equip store with dedicated pharmaceutical refrigerator and digital temperature logbook', completed: false },
        { id: 'fda-3', title: 'Register FDA eServices account at eservices.fda.gov.ph and submit LTO Drug Outlet form', completed: false },
        { id: 'fda-4', title: 'Upload location floor plan, pharmacist credentials, and pay official FDA inspection fee', completed: false },
        { id: 'fda-5', title: 'Undergo FDA post-marketing inspection and download official LTO Certificate', completed: false },
      ],
    },
  },

  water: {
    businessType: 'Water Refilling Station',
    primaryAgency: 'Department of Health (DOH) & City Health BPLO',
    agencyAcronym: 'DOH',
    licenseName: 'DOH Drinking Water Sanitation Permit & Certificate of Potability',
    legalBasis: 'PD 856 (Sanitation Code) & PNSDW (AO 2017-0010)',
    estimatedTime: '7 - 14 Business Days',
    estimatedCost: '₱3,000 - ₱6,000',
    focusedRequirements: [
      {
        title: 'Monthly Bacteriological Water Test Analysis',
        description: 'Certified lab analysis verifying zero coliform and E. coli in treated product water under Philippine National Standards for Drinking Water.',
        isMandatory: true,
        documentCode: 'PNSDW-BAC',
      },
      {
        title: 'Semi-Annual Physical-Chemical Water Examination',
        description: 'Laboratory testing for heavy metals, turbidity, pH, and total dissolved solids (TDS).',
        isMandatory: true,
        documentCode: 'PNSDW-PHY',
      },
      {
        title: 'Food Handler Health Certificates for Staff',
        description: 'Sanitary pink health cards for all refilling, capping, and delivery personnel from City Health Office.',
        isMandatory: true,
      },
      {
        title: 'Backwashing Log & UV / RO Filter Maintenance Schedule',
        description: 'Daily maintenance record for carbon filter backwashing and ultraviolet sterilizer lamp wattage inspection.',
        isMandatory: true,
      },
    ],
    legalConsiderations: [
      {
        title: 'Strict Public Health Liability for Contaminated Water',
        law: 'PD 856 Chapter II (Water Supply)',
        summary: 'Owners are criminally and civilly liable for any disease outbreaks resulting from unsafe water dispensing.',
        penaltyOrLiability: 'Immediate station padlocking, license revocation, and criminal charges under the Revised Penal Code.',
      },
      {
        title: 'Clear Labeling & Container Seal Integrity',
        law: 'RA 7394 (Consumer Act)',
        summary: 'All 5-gallon bottles must bear sanitized tamper-evident cap seals and lot/batch processing dates.',
        penaltyOrLiability: 'Fines for deceptive consumer product packaging.',
      },
    ],
    mandatoryDiscountsApplicable: [
      '5% Special Discount on Basic Necessities for Senior Citizens (DTI-DA-DOE JAO)',
      'Clean Drinking Water Sanitation Standards (PNSDW AO 2017-0010)',
    ],
    roadmapTask: {
      title: 'DOH Drinking Water Potability & Sanitary Clearance',
      desc: 'Mandatory laboratory testing and sanitary inspection clearance authorizing commercial sale of purified water.',
      category: 'Permits',
      agency: 'City Health Office Sanitation Division & DOH Accredited Lab',
      legal_basis: 'PD 856 (Sanitation Code) & AO 2017-0010',
      estimated_time: '7 - 14 Business Days',
      estimated_cost: '₱3,000 - ₱6,000',
      required_docs: [
        'DOH-Accredited Lab Microbiological Test',
        'Physical-Chemical Lab Test Report',
        'Personnel Sanitary Health Cards',
        'Water Treatment System Flowchart Schematic',
      ],
      sub_steps: [
        { id: 'water-1', title: 'Submit product water samples to DOH-accredited testing laboratory for bacteriological analysis', completed: false },
        { id: 'water-2', title: 'Send station crew to City Health Office for chest X-ray, stool test, and pink health cards', completed: false },
        { id: 'water-3', title: 'Establish documented daily backwashing and UV lamp inspection logbook', completed: false },
        { id: 'water-4', title: 'Undergo City Sanitary Inspector on-site inspection of filling room and wash sink', completed: false },
        { id: 'water-5', title: 'Claim official Sanitary Permit and framed Certificate of Potability for public display', completed: false },
      ],
    },
  },

  food: {
    businessType: 'Food Service / Carinderia / Restaurant / Bakery',
    primaryAgency: 'City Health Office (Sanitation Division) & DOH',
    agencyAcronym: 'CHO-DOH',
    licenseName: 'City Sanitary Permit & Food Handler Health Certificates',
    legalBasis: 'PD 856 (Code on Sanitation of the Philippines) & RA 10611 (Food Safety Act)',
    estimatedTime: '5 - 10 Business Days',
    estimatedCost: '₱1,500 - ₱3,500',
    focusedRequirements: [
      {
        title: 'Food Handler Health Certificates (Pink Cards)',
        description: 'Annual medical clearance (stool exam, chest X-ray, hepatitis screening) for all cooks, servers, and dishwashers.',
        isMandatory: true,
      },
      {
        title: 'Grease Trap Installation & Waste Segregation',
        description: 'Functional stainless steel grease trap under kitchen sink preventing oil discharge into municipal drains.',
        isMandatory: true,
      },
      {
        title: 'Clean Food Preparation Area & Pest Control Contract',
        description: 'Screened food display warmers, pest exclusion screens, and food-grade stainless prep counters.',
        isMandatory: true,
      },
    ],
    legalConsiderations: [
      {
        title: 'Mandatory 20% Senior Citizen & PWD Meal Discount',
        law: 'RA 9994 & RA 10754',
        summary: '20% discount plus 12% VAT exemption on food and drink consumed by or bought for the senior citizen or PWD.',
        penaltyOrLiability: 'LGU permit cancellation and fines up to ₱200,000 for refusing discounts.',
      },
      {
        title: 'Food Safety Liability & Consumer Protection',
        law: 'RA 10611 (Food Safety Act of 2013)',
        summary: 'Strict regulatory liability for selling adulterated, spoiled, or contaminated food products.',
        penaltyOrLiability: 'Suspension of operations and consumer damage restitution.',
      },
    ],
    mandatoryDiscountsApplicable: [
      '20% Senior Citizen Discount on Meals (RA 9994) + 12% VAT Exemption',
      '20% PWD Discount on Meals (RA 10754) + 12% VAT Exemption',
      'Clearly Posted Price Menu Board (RA 7394 Price Tag Law)',
    ],
    roadmapTask: {
      title: 'City Health Sanitary Permit & Food Handler Clearances',
      desc: 'Mandatory health safety inspection and staff clearance required before preparing or serving food commercially.',
      category: 'Permits',
      agency: 'City / Municipal Health Office Sanitation Section',
      legal_basis: 'PD 856 Sanitation Code & RA 10611 Food Safety Act',
      estimated_time: '5 - 10 Business Days',
      estimated_cost: '₱1,500 - ₱3,500',
      required_docs: [
        'Staff Medical Exam & Laboratory Clearances',
        'Grease Trap Installation Receipt/Photo',
        'Pest Control Inspection Certification',
        'Potable Water Source Certificate',
      ],
      sub_steps: [
        { id: 'food-1', title: 'Coordinate staff laboratory tests (chest X-ray & stool examination) at City Health Clinic', completed: false },
        { id: 'food-2', title: 'Install required kitchen grease trap and ensure food warmers have glass sneeze guards', completed: false },
        { id: 'food-3', title: 'Attend LGU Food Safety & Hygiene Seminar to secure food handler credentials', completed: false },
        { id: 'food-4', title: 'Undergo City Sanitary Inspector kitchen and dining inspection', completed: false },
        { id: 'food-5', title: 'Obtain framed Sanitary Permit to Operate and post prominently in dining area', completed: false },
      ],
    },
  },

  veterinary: {
    businessType: 'Veterinary Clinic / Pet Supplies / Pet Grooming',
    primaryAgency: 'Bureau of Animal Industry (BAI) - Animal Health Division',
    agencyAcronym: 'BAI',
    licenseName: 'BAI Animal Facility Registration Certificate',
    legalBasis: 'RA 8485 (Animal Welfare Act) & RA 9482 (Anti-Rabies Act)',
    estimatedTime: '10 - 20 Business Days',
    estimatedCost: '₱2,500 - ₱5,000',
    focusedRequirements: [
      {
        title: 'PRC Licensed Veterinarian Supervision',
        description: 'Certified PRC licensed veterinarian overseeing pet medical procedures, medication dispensing, and clinical records.',
        isMandatory: true,
        documentCode: 'PRC-DVM',
      },
      {
        title: 'Isolation Cage & Infectious Ward',
        description: 'Dedicated isolated holding area for contagious animals separated from healthy grooming or boarding pets.',
        isMandatory: true,
      },
      {
        title: 'Biological Waste Disposal & Vaccine Storage Log',
        description: 'Sharps container, biohazard disposal contract, and dedicated vaccine refrigerator with temperature log.',
        isMandatory: true,
      },
    ],
    legalConsiderations: [
      {
        title: 'Animal Welfare Act Standards',
        law: 'RA 8485 as amended by RA 10631',
        summary: 'Cruelty-free handling, humane housing dimensions, and proper sanitary standards for all animal facilities.',
        penaltyOrLiability: 'Fines up to ₱250,000 and imprisonment for animal cruelty or operating unregistered facilities.',
      },
      {
        title: 'Mandatory Anti-Rabies Vaccination Registry',
        law: 'RA 9482 (Anti-Rabies Act)',
        summary: 'All rabies vaccinations must be logged in an official registry and reported to the City Veterinarian.',
        penaltyOrLiability: 'Suspension of clinic accreditation for failure to report rabies vaccinations.',
      },
    ],
    mandatoryDiscountsApplicable: [
      'RA 7394 Consumer Protection on Veterinary Products & Pet Food',
      'Mandatory Posted Service Rates (Consumer Act)',
    ],
    roadmapTask: {
      title: 'BAI Animal Facility Registration & Veterinary Compliance',
      desc: 'National registration with the Bureau of Animal Industry authorizing operation of pet clinics, grooming, and pet supplies.',
      category: 'Permits',
      agency: 'Bureau of Animal Industry (BAI) & City Veterinary Office',
      legal_basis: 'RA 8485 (Animal Welfare Act) & RA 9482',
      estimated_time: '10 - 20 Business Days',
      estimated_cost: '₱2,500 - ₱5,000',
      required_docs: [
        'PRC Veterinarian License & Certificate of Good Standing',
        'BAI Animal Facility Application Form',
        'Clinic Floor Plan with Isolation Area',
        'Biohazard / Sharps Waste Disposal Agreement',
      ],
      sub_steps: [
        { id: 'vet-1', title: 'Partner with PRC Licensed Veterinarian and register with City Veterinary Office', completed: false },
        { id: 'vet-2', title: 'Install proper stainless cages, isolation ward, and dedicated medical waste container', completed: false },
        { id: 'vet-3', title: 'Submit Animal Facility Registration application to Bureau of Animal Industry (BAI)', completed: false },
        { id: 'vet-4', title: 'Undergo BAI facility inspection evaluating ventilation, sanitation, and animal welfare', completed: false },
        { id: 'vet-5', title: 'Receive official BAI Certificate of Registration for public clinic display', completed: false },
      ],
    },
  },

  construction: {
    businessType: 'Construction / General Contracting / Trade Contractor',
    primaryAgency: 'Philippine Contractors Accreditation Board (PCAB)',
    agencyAcronym: 'PCAB',
    licenseName: 'PCAB Contractor License (Trade / Category D)',
    legalBasis: 'RA 4566 (Contractor Licensing Law) & DOLE DO 198-18 (OSH Act)',
    estimatedTime: '20 - 45 Business Days',
    estimatedCost: '₱7,000 - ₱15,000',
    focusedRequirements: [
      {
        title: 'Authorized Managing Officer (AMO) Course Completion',
        description: '16-hour AMO seminar certificate conducted by PCAB/CIAP accredited training providers.',
        isMandatory: true,
        documentCode: 'PCAB-AMO',
      },
      {
        title: 'DOLE 40-Hour COSH Safety Officer Certification',
        description: 'Construction Occupational Safety and Health (COSH) certified safety officer on staff.',
        isMandatory: true,
        documentCode: 'DOLE-COSH',
      },
      {
        title: 'Audited Financial Statement & Minimum Net Worth Proof',
        description: 'Certified financial statements meeting the minimum capitalization required for your desired contractor category.',
        isMandatory: true,
      },
    ],
    legalConsiderations: [
      {
        title: 'Prohibition Against Unlicensed Contracting',
        law: 'RA 4566 Section 35',
        summary: 'Engaging in construction contracting without a valid PCAB license is a criminal offense punishable by fine and blacklisting.',
        penaltyOrLiability: 'Criminal prosecution, project work stoppage, and disqualification from government/commercial contracts.',
      },
      {
        title: 'Mandatory Worker Safety Equipment & Social Security',
        law: 'RA 11058 (OSH Law) & DOLE DO 13',
        summary: 'Employer must provide free certified PPE (hard hats, boots, harnesses) and mandatory SSS/PhilHealth coverage for all site workers.',
        penaltyOrLiability: 'Strict DOLE fines of up to ₱100,000 per day for workplace safety violations.',
      },
    ],
    mandatoryDiscountsApplicable: [
      'Standardized Philippine Bidding & Contract Documents (RA 9184 & CIAC Rules)',
      'DOLE Minimum Wage & OSH Standards Compliance',
    ],
    roadmapTask: {
      title: 'PCAB Contractor Licensing & Safety Accreditation',
      desc: 'National accreditation with the Philippine Contractors Accreditation Board legally authorizing commercial construction projects.',
      category: 'Permits',
      agency: 'Philippine Contractors Accreditation Board (PCAB / CIAP)',
      legal_basis: 'RA 4566 & DOLE DO 198-18',
      estimated_time: '20 - 45 Business Days',
      estimated_cost: '₱7,000 - ₱15,000',
      required_docs: [
        'AMO Seminar Completion Certificate',
        'COSH 40-Hour Safety Officer Certificate',
        'Audited Financial Statements / Bank Certification',
        'DTI Certificate / SEC Registration',
      ],
      sub_steps: [
        { id: 'pcab-1', title: 'Complete the 16-hour Authorized Managing Officer (AMO) seminar via CIAP portal', completed: false },
        { id: 'pcab-2', title: 'Appoint staff member to complete 40-hour DOLE COSH Safety Officer training', completed: false },
        { id: 'pcab-3', title: 'Compile audited balance sheet verifying required net worth capitalization', completed: false },
        { id: 'pcab-4', title: 'File online PCAB License application through the CIAP contractor portal', completed: false },
        { id: 'pcab-5', title: 'Claim official PCAB Contractor License Certificate and verify active listing', completed: false },
      ],
    },
  },

  genericRetail: {
    businessType: 'General Retail / Sari-Sari Store / Micro Trading',
    primaryAgency: 'DTI BMBE Division & Local BPLO',
    agencyAcronym: 'DTI-BMBE',
    licenseName: 'BMBE Certificate of Authority & LGU Micro Commercial Clearance',
    legalBasis: 'RA 9178 (Barangay Micro Business Enterprises Act) & RA 7394 (Consumer Act)',
    estimatedTime: '3 - 7 Business Days',
    estimatedCost: '₱500 - ₱1,500',
    focusedRequirements: [
      {
        title: 'BMBE 100% Income Tax Exemption Registration',
        description: 'Official registration under RA 9178 granting full income tax exemption from operations for micro-enterprises with assets under ₱3M.',
        isMandatory: true,
        documentCode: 'DTI-BMBE',
      },
      {
        title: 'Clearly Displayed Peso Price Tags (Price Tag Law)',
        description: 'Physical price tags or visible price list in Philippine Pesos attached to all goods offered for sale with zero hidden charges.',
        isMandatory: true,
      },
      {
        title: 'LGU Special Retail Permits for Tobacco or Liquor',
        description: 'Specific LGU permit add-on if selling beer, liquor, or cigarettes, observing strict zoning away from schools.',
        isMandatory: false,
      },
    ],
    legalConsiderations: [
      {
        title: 'Price Tag Law & Prohibition of Selling Above Tagged Price',
        law: 'RA 7394 (Consumer Act) Article 81',
        summary: 'All products must have clearly legible price tags in PHP; selling above the tagged price or deceptive pricing is illegal.',
        penaltyOrLiability: 'DTI fines up to ₱10,000 per violation and potential store closure.',
      },
      {
        title: 'Strict Prohibition of Tobacco & Alcohol Sales to Minors',
        law: 'RA 9211 (Tobacco Regulation Act) & LGU Ordinances',
        summary: 'Selling cigarettes, vapes, or alcoholic beverages to anyone under 18 years of age is strictly prohibited within 100 meters of any school.',
        penaltyOrLiability: 'Revocation of business permit and criminal fines for selling to minors.',
      },
    ],
    mandatoryDiscountsApplicable: [
      '5% Special Discount on Basic Necessities for Senior Citizens (DTI-DA JAO)',
      'Display of DTI BMBE Certificate of Authority',
    ],
    roadmapTask: {
      title: 'DTI BMBE Registration & Fair Trade Compliance',
      desc: 'Register as a Barangay Micro Business Enterprise for tax exemptions and establish legal price tag displays.',
      category: 'Permits',
      agency: 'DTI Negosyo Center & Local BPLO',
      legal_basis: 'RA 9178 (BMBE Act) & RA 7394',
      estimated_time: '3 - 7 Business Days',
      estimated_cost: '₱500 - ₱1,500',
      required_docs: [
        'DTI Certificate of Business Name Registration',
        'Barangay Clearance with Micro-Enterprise Notation',
        'Notarized Certificate of Total Assets (under ₱3 Million)',
      ],
      sub_steps: [
        { id: 'bmbe-1', title: 'File BMBE application at local DTI Negosyo Center for 100% income tax exemption', completed: false },
        { id: 'bmbe-2', title: 'Affix clear peso price tags to every product shelf complying with RA 7394 Price Tag Law', completed: false },
        { id: 'bmbe-3', title: 'Ensure no tobacco or alcohol is displayed within 100 meters of any school or playground', completed: false },
        { id: 'bmbe-4', title: 'Register BMBE status with assigned BIR RDO to formalize tax exemption endorsement', completed: false },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// 2. Search-Architected Prompt Generator
// Simulates authoritative gov.ph web portal queries to discover focused permits
// ---------------------------------------------------------------------------
const buildSearchArchitectedPrompt = (req: AnalyzeRegulatoryRequest): string => {
  const jsonPayload = JSON.stringify({
    business_type: req.businessType,
    business_name: req.businessName || `${req.businessType} Venture`,
    location: req.location || 'Philippines',
    category: req.category || 'Commercial',
    starting_budget: req.startingBudget || 'Micro-Enterprise (< ₱100k)',
    registration_type: req.registrationType || 'Sole Proprietorship',
    is_product_based: req.isProductBased ?? true,
  }, null, 2);

  return [
    'You are Khora AI, the premier Philippine Commercial Law and Industry Regulatory Architect.',
    'A Filipino entrepreneur is launching a new venture with the following verified profile:',
    '```json',
    jsonPayload,
    '```',
    '',
    '[INSTRUCT SEARCH ARCHITECTURE ON WWW (GOV.PH PORTALS)]',
    'Simulate an exhaustive web research query across official Philippine Government regulatory portals (site:gov.ph), including:',
    '• Food and Drug Administration (fda.gov.ph) for drugs, pharmacies, cosmetics, medical devices, and packaged foods.',
    '• Department of Health (doh.gov.ph) for health facilities, water refilling stations, and municipal sanitation.',
    '• Bureau of Animal Industry (bai.da.gov.ph) for veterinary clinics, pet shops, and animal feeds.',
    '• Philippine Contractors Accreditation Board (ciap.dti.gov.ph/pcab) for construction, contracting, and trade works.',
    '• Department of Education (deped.gov.ph) & DSWD for childcare, daycare, and tutoring centers.',
    '• PNP-SOSIA for security services, DENR-EMB for environmental compliance, and DTI BMBE for micro-enterprises.',
    '',
    '[CRITICAL FOCUS REQUIREMENT: NO GENERIC ANSWERS]',
    'Do NOT give generic Barangay, DTI, or BIR registration steps alone. The requirements must be SHARPLY FOCUSED on the exact industry:',
    '• For Pharmacy: You MUST detail the FDA License to Operate (LTO) as Retail Drug Outlet, PRC Registered Pharmacist credentials, refrigerator/cold-chain thermometer logbook, PNDF copy, and prescription books.',
    '• For Food Service: You MUST detail the Sanitary Permit, pink food handler health cards with stool/X-ray exams, grease traps, and DOH Food Safety standards.',
    '• For Water Refilling: You MUST detail DOH potability analysis (bacteriological and physical-chemical lab tests under PNSDW).',
    '• For Veterinary/Pet: You MUST detail BAI facility registration, licensed veterinarian requirements, and animal welfare isolation wards.',
    '• For Construction: You MUST detail PCAB license category, AMO seminar, and DOLE COSH safety officer certification.',
    '• For ANY other business: Identify the exact governing Republic Act, specific industry license, and specialized technical requirements.',
    '',
    '[LEGAL CONSIDERATIONS & STATUTORY OBLIGATIONS]',
    'Include at least 3 concrete Philippine legal considerations:',
    '1. Statutory discount compliance: 20% Senior Citizen (RA 9994) & PWD (RA 10754) discounts and 12% VAT exemption rules.',
    '2. Price regulation: Price Tag Law (RA 7394) and automatic Price Freeze rules during a State of Calamity (RA 7581 Price Act).',
    '3. Specific industry liabilities, prohibited acts, and statutory penalties.',
    '',
    'Reply with ONLY a valid, raw JSON object matching this exact schema (no markdown formatting, no text before or after):',
    '{',
    '  "business_type": "<official business name>",',
    '  "primary_agency": "<Full official name of the primary regulatory body>",',
    '  "agency_acronym": "<e.g. FDA, DOH, BAI, PCAB, DTI-BMBE>",',
    '  "license_name": "<Exact official license/permit to operate name>",',
    '  "legal_basis": "<Exact Republic Act or Presidential Decree with numbers>",',
    '  "estimated_time": "<e.g. 15 - 30 Business Days>",',
    '  "estimated_cost": "<e.g. ₱2,000 - ₱5,000>",',
    '  "focused_requirements": [',
    '    {',
    '      "title": "<Specific requirement title>",',
    '      "description": "<Detailed concrete requirement, personnel credential, equipment or logbook>",',
    '      "is_mandatory": true',
    '    }',
    '  ],',
    '  "legal_considerations": [',
    '    {',
    '      "title": "<Specific legal compliance topic>",',
    '      "law": "<e.g. RA 9994 / RA 7581>",',
    '      "summary": "<1-2 clear sentences explaining the legal obligation>",',
    '      "penalty_or_liability": "<Consequences or fines for non-compliance>"',
    '    }',
    '  ],',
    '  "mandatory_discounts_applicable": [',
    '    "<Discount rule 1>",',
    '    "<Discount rule 2>"',
    '  ],',
    '  "roadmap_task": {',
    '    "title": "<Concise task title for the roadmap>",',
    '    "desc": "<1-2 sentence description of securing this regulatory permit>",',
    '    "category": "Permits",',
    '    "agency": "<Agency name>",',
    '    "legal_basis": "<Legal basis>",',
    '    "estimated_time": "<Time frame>",',
    '    "estimated_cost": "<Cost range>",',
    '    "required_docs": ["<Doc 1>", "<Doc 2>", "<Doc 3>", "<Doc 4>"],',
    '    "sub_steps": [',
    '      { "id": "reg-1", "title": "<Step 1>", "completed": false },',
    '      { "id": "reg-2", "title": "<Step 2>", "completed": false },',
    '      { "id": "reg-3", "title": "<Step 3>", "completed": false },',
    '      { "id": "reg-4", "title": "<Step 4>", "completed": false }',
    '    ]',
    '  }',
    '}',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// 3. Fallback Resolver
// Matches business type keywords to our authoritative offline registry
// ---------------------------------------------------------------------------
export const matchRegistryProfile = (businessType: string): RegulatoryProfile => {
  const lower = (businessType || '').toLowerCase();

  if (
    lower.includes('pharmacy') ||
    lower.includes('drug') ||
    lower.includes('botika') ||
    lower.includes('gamot') ||
    lower.includes('medicine') ||
    lower.includes('apothecary')
  ) {
    return { ...PHILIPPINE_REGULATORY_REGISTRY.pharmacy, source: 'registry' };
  }

  if (
    lower.includes('water') ||
    lower.includes('refill') ||
    lower.includes('purified') ||
    lower.includes('tubig') ||
    lower.includes('mineral')
  ) {
    return { ...PHILIPPINE_REGULATORY_REGISTRY.water, source: 'registry' };
  }

  if (
    lower.includes('food') ||
    lower.includes('carinderia') ||
    lower.includes('restaurant') ||
    lower.includes('bakery') ||
    lower.includes('catering') ||
    lower.includes('eatery') ||
    lower.includes('cafe') ||
    lower.includes('coffee') ||
    lower.includes('kainan')
  ) {
    return { ...PHILIPPINE_REGULATORY_REGISTRY.food, source: 'registry' };
  }

  if (
    lower.includes('vet') ||
    lower.includes('pet') ||
    lower.includes('animal') ||
    lower.includes('dog') ||
    lower.includes('cat') ||
    lower.includes('grooming')
  ) {
    return { ...PHILIPPINE_REGULATORY_REGISTRY.veterinary, source: 'registry' };
  }

  if (
    lower.includes('construct') ||
    lower.includes('contractor') ||
    lower.includes('build') ||
    lower.includes('renovat') ||
    lower.includes('plumb') ||
    lower.includes('electric')
  ) {
    return { ...PHILIPPINE_REGULATORY_REGISTRY.construction, source: 'registry' };
  }

  // Default micro-trading / retail fallback
  return {
    ...PHILIPPINE_REGULATORY_REGISTRY.genericRetail,
    businessType: businessType || 'General Micro Business',
    source: 'registry',
  };
};

// ---------------------------------------------------------------------------
// 4. Main Service: Analyze Business Regulation & Legal Considerations
// ---------------------------------------------------------------------------
export const analyzeBusinessRegulation = async (
  req: AnalyzeRegulatoryRequest
): Promise<RegulatoryProfile> => {
  const fallback = matchRegistryProfile(req.businessType);

  try {
    const prompt = buildSearchArchitectedPrompt(req);
    const systemPrompt =
      'You are Khora AI, an authoritative Philippine legal, regulatory compliance, and business architecture system. Return raw JSON strictly matching the requested schema.';

    // 15 second timeout to maintain snappy UX
    const aiPromise = askKhoraAI(prompt, systemPrompt);
    const timeoutPromise = new Promise<{ content: string; success: boolean }>((_, reject) =>
      setTimeout(() => reject(new Error('Regulatory AI timeout')), 15000)
    );

    const response = (await Promise.race([aiPromise, timeoutPromise])) as any;

    if (!response || !response.success || !response.content) {
      return fallback;
    }

    const parsed = extractJsonObject(response.content);
    if (!parsed || !parsed.primary_agency || !parsed.license_name) {
      return fallback;
    }

    const focusedRequirements: RegulatoryRequirement[] = Array.isArray(parsed.focused_requirements)
      ? parsed.focused_requirements
          .map((r: any) => ({
            title: cleanText(r.title, 80),
            description: cleanText(r.description, 250),
            isMandatory: r.is_mandatory !== false,
            documentCode: cleanText(r.document_code, 30),
          }))
          .filter((r: RegulatoryRequirement) => r.title && r.description)
      : fallback.focusedRequirements;

    const legalConsiderations: LegalConsideration[] = Array.isArray(parsed.legal_considerations)
      ? parsed.legal_considerations
          .map((l: any) => ({
            title: cleanText(l.title, 80),
            law: cleanText(l.law, 60),
            summary: cleanText(l.summary, 250),
            penaltyOrLiability: cleanText(l.penalty_or_liability, 200),
          }))
          .filter((l: LegalConsideration) => l.title && l.summary)
      : fallback.legalConsiderations;

    const mandatoryDiscountsApplicable: string[] = Array.isArray(parsed.mandatory_discounts_applicable)
      ? parsed.mandatory_discounts_applicable
          .map((d: any) => cleanText(d, 100))
          .filter(Boolean)
      : fallback.mandatoryDiscountsApplicable;

    const rt = parsed.roadmap_task || {};
    const roadmapTask = {
      title: cleanText(rt.title, 80) || fallback.roadmapTask.title,
      desc: cleanText(rt.desc, 250) || fallback.roadmapTask.desc,
      category: 'Permits' as const,
      agency: cleanText(rt.agency, 100) || cleanText(parsed.primary_agency, 100) || fallback.roadmapTask.agency,
      legal_basis: cleanText(rt.legal_basis, 100) || cleanText(parsed.legal_basis, 100) || fallback.roadmapTask.legal_basis,
      estimated_time: cleanText(rt.estimated_time, 50) || fallback.roadmapTask.estimated_time,
      estimated_cost: cleanText(rt.estimated_cost, 50) || fallback.roadmapTask.estimated_cost,
      required_docs: Array.isArray(rt.required_docs)
        ? rt.required_docs.map((d: any) => cleanText(d, 80)).filter(Boolean)
        : fallback.roadmapTask.required_docs,
      sub_steps: Array.isArray(rt.sub_steps) && rt.sub_steps.length > 0
        ? rt.sub_steps.map((s: any, idx: number) => ({
            id: `reg-${idx + 1}`,
            title: cleanText(s.title || s, 150),
            completed: false,
          }))
        : fallback.roadmapTask.sub_steps,
    };

    return {
      businessType: cleanText(parsed.business_type, 80) || req.businessType,
      primaryAgency: cleanText(parsed.primary_agency, 100) || fallback.primaryAgency,
      agencyAcronym: cleanText(parsed.agency_acronym, 20) || fallback.agencyAcronym,
      licenseName: cleanText(parsed.license_name, 120) || fallback.licenseName,
      legalBasis: cleanText(parsed.legal_basis, 120) || fallback.legalBasis,
      estimatedTime: cleanText(parsed.estimated_time, 50) || fallback.estimatedTime,
      estimatedCost: cleanText(parsed.estimated_cost, 50) || fallback.estimatedCost,
      focusedRequirements: focusedRequirements.length > 0 ? focusedRequirements : fallback.focusedRequirements,
      legalConsiderations: legalConsiderations.length > 0 ? legalConsiderations : fallback.legalConsiderations,
      mandatoryDiscountsApplicable:
        mandatoryDiscountsApplicable.length > 0
          ? mandatoryDiscountsApplicable
          : fallback.mandatoryDiscountsApplicable,
      roadmapTask,
      source: 'khora-ai',
    };
  } catch (err) {
    console.warn('Regulatory analysis fallback used:', err);
    return fallback;
  }
};

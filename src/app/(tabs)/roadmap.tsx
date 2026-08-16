import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  CheckCircle2, 
  Circle, 
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
  ChevronRight,
  Trash2
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { createRoadmapUuid, deleteRoadmapTask, fetchUserRoadmap, saveUserRoadmap, RoadmapTask, SubStep, getDefaultPhilippineRoadmapTasks } from '@/services/supabase';
import { askKhoraAI } from '@/services/claude';

// Helper to guarantee authentic legal basis, agency, timeline, cost, required docs, and actionable sub-steps for any task
const ensureSubSteps = (task: RoadmapTask): RoadmapTask => {
  if (task.sub_steps && task.sub_steps.length > 0 && task.legal_basis) return task;

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

  const template = matchedKey ? defaultSubStepsMap[matchedKey] : {
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

export default function RoadmapTab() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { unreadCount, addNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [selectedTaskModal, setSelectedTaskModal] = useState<RoadmapTask | null>(null);
  const [taskPendingDeletion, setTaskPendingDeletion] = useState<RoadmapTask | null>(null);
  const [activeCategory, setActiveCategory] = useState<'All' | 'Permits' | 'Supplies' | 'Finance' | 'Launch'>('All');
  const [aiAdviceModal, setAiAdviceModal] = useState<{ title: string; advice: string } | null>(null);
  const [taskAiAdviceMap, setTaskAiAdviceMap] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCustomTaskModal, setShowCustomTaskModal] = useState(false);
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [customTaskDescription, setCustomTaskDescription] = useState('');
  const [customTaskCategory, setCustomTaskCategory] = useState('General');

  // Load User Roadmap from Supabase or generate default
  useEffect(() => {
    const loadRoadmap = async () => {
      setLoading(true);
      let loadedTasks: RoadmapTask[] = [];

      if (user?.uid) {
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

      // Hydrate all tasks with rich legal basis & actionable sub-steps
      const hydrated = loadedTasks.map(ensureSubSteps);
      setTasks(hydrated);

      if (user?.uid) {
        await saveUserRoadmap(hydrated);
      }
      setLoading(false);
    };

    loadRoadmap();
  }, [user, userProfile]);

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
    await saveUserRoadmap(updated);
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
    await saveUserRoadmap(updated);
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

  // Start Template Roadmap
  const handleStartTemplate = async (templateName: string, templateTasks: Array<Omit<RoadmapTask, 'user_id'>>) => {
    if (!user?.uid) return;

    const newTasks: RoadmapTask[] = templateTasks.map((t, idx) => ensureSubSteps({
      ...t,
      user_id: user.uid,
      id: `${Date.now()}-${idx}`,
      step_order: idx + 1,
    }));

    setTasks(newTasks);
    await saveUserRoadmap(newTasks);
    setShowTemplates(false);

    Alert.alert('New Roadmap Started!', `Switched active launch plan to "${templateName}". Real Philippine legal steps are now loaded.`);
  };

  const createCustomTask = async () => {
    if (!user?.uid || !customTaskTitle.trim()) {
      Alert.alert('Add a task title', 'Describe the business task you want to track.');
      return;
    }
    const newTask: RoadmapTask = {
      id: createRoadmapUuid(),
      client_key: `custom-${Date.now()}`,
      user_id: user.uid,
      title: customTaskTitle.trim(),
      desc: customTaskDescription.trim(),
      category: customTaskCategory.trim() || 'General',
      status: 'Pending',
      step_order: tasks.length + 1,
      sub_steps: [],
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    const { error } = await saveUserRoadmap(updated);
    if (error) {
      setTasks(tasks);
      Alert.alert('Could not save task', 'Run the Week 4 database migration, then try again.');
      return;
    }
    setCustomTaskTitle('');
    setCustomTaskDescription('');
    setCustomTaskCategory('General');
    setShowCustomTaskModal(false);
  };

  const removeTask = (task: RoadmapTask) => {
    if (!user?.uid || (!task.id && !task.client_key)) return;
    setTaskPendingDeletion(task);
  };

  const confirmRemoveTask = async () => {
    if (!user?.uid || !taskPendingDeletion) return;

    const task = taskPendingDeletion;
    const { error } = await deleteRoadmapTask(user.uid, task.id, task.client_key || task.id);
    if (error) {
      Alert.alert('Could not delete task', 'Please try again.');
      return;
    }

    setTasks((current) => current.filter((item) => item.id !== task.id && item.client_key !== task.client_key));
    setTaskPendingDeletion(null);
  };

  // Calculate Progress
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Filter Tasks by Category
  const filteredTasks = tasks.filter((t) => {
    if (activeCategory === 'All') return true;
    return t.category === activeCategory;
  });

  // Template Library
  const STARTUP_TEMPLATES = [
    {
      title: 'Milk Tea & Beverage Kiosk',
      budget: '₱25,000 – ₱50,000',
      tasksCount: '6 Legal & Prep Steps',
      desc: 'Authentic Philippine setup guide for boba milk tea, fruit teas, and cup sealing kiosks.',
      tasks: [
        { 
          title: 'Secure Commercial Kiosk Location', 
          category: 'Supplies', 
          status: 'Pending' as const, 
          desc: 'Inspect high-foot traffic location with electrical voltage and water outlet access.',
          legal_basis: 'Article 1643 Civil Code of the Philippines (Lease Contracts)',
          agency: 'Lessor / Mall BPLO Desk',
          estimated_time: '2 - 4 Days',
          estimated_cost: '₱5,000 Deposit',
          required_docs: ['Commercial Lease Agreement', 'Lessor Valid ID'],
          sub_steps: [
            { id: 'mt-1-1', title: 'Survey 3 high foot-traffic spots near schools or transport terminals', completed: false },
            { id: 'mt-1-2', title: 'Verify electrical load voltage and clean water line accessibility', completed: false },
            { id: 'mt-1-3', title: 'Negotiate monthly rental rate and advance deposit terms', completed: false },
            { id: 'mt-1-4', title: 'Sign notarized Commercial Lease Agreement', completed: false },
          ]
        },
        { 
          title: 'Barangay & DTI Name Registration', 
          category: 'Permits', 
          status: 'Pending' as const, 
          desc: 'Register business name as Milk Tea Kiosk.',
          legal_basis: 'Act No. 3883 & RA 9178 BMBE Act',
          agency: 'DTI BNRS & Barangay Hall',
          estimated_time: '1 Day',
          estimated_cost: '₱730',
          required_docs: ['Valid Government ID', 'Cedula'],
          sub_steps: [
            { id: 'mt-2-1', title: 'Register DTI Business Name online at BNRS portal', completed: false },
            { id: 'mt-2-2', title: 'Obtain Barangay Micro-Business Clearance', completed: false },
            { id: 'mt-2-3', title: 'Apply for City Health Food Sanitary Permit', completed: false },
          ]
        },
        { 
          title: 'Source Boba, Teas & Sealer Machine', 
          category: 'Supplies', 
          status: 'Pending' as const, 
          desc: 'Buy wholesale tapioca pearls, syrup, and cup sealer from Divisoria.',
          legal_basis: 'RA 7394 Consumer Act & Food Safety Standards',
          agency: 'Wholesale Distributors',
          estimated_time: '2 Days',
          estimated_cost: '₱15,000',
          required_docs: ['Supplier Equipment Warranty', 'Price Quotations'],
          sub_steps: [
            { id: 'mt-3-1', title: 'Purchase manual or auto cup sealing machine with warranty', completed: false },
            { id: 'mt-3-2', title: 'Buy bulk tapioca pearls, tea leaves & flavor syrups', completed: false },
            { id: 'mt-3-3', title: 'Procure custom printed 16oz & 22oz PP cups with plastic film', completed: false },
          ]
        },
        { 
          title: 'Recipe Standard Costing & Margins', 
          category: 'Finance', 
          status: 'Pending' as const, 
          desc: 'Compute exact ingredient cost per 16oz and 22oz cup serving.',
          legal_basis: 'BMBE Cost Accounting Standards',
          agency: 'Internal Operations',
          estimated_time: '1 Day',
          estimated_cost: 'Free',
          required_docs: ['Recipe Sheet', 'Packaging Cost Log'],
          sub_steps: [
            { id: 'mt-4-1', title: 'Measure raw tea brewed per liter cost', completed: false },
            { id: 'mt-4-2', title: 'Calculate pearl, syrup, ice & cup cost per serving', completed: false },
            { id: 'mt-4-3', title: 'Set menu prices for 16oz (₱49-₱69) and 22oz (₱69-₱89)', completed: false },
          ]
        },
        { 
          title: 'Sanitary Permit & Mayor Clearance', 
          category: 'Permits', 
          status: 'Pending' as const, 
          desc: 'Obtain food handler sanitary clearance from City Health Office.',
          legal_basis: 'PD 856 Sanitation Code of the Philippines',
          agency: 'City Health Office & BPLO',
          estimated_time: '3 Days',
          estimated_cost: '₱1,200',
          required_docs: ['Chest X-ray Result', 'Stool Sample Test', 'Health Card'],
          sub_steps: [
            { id: 'mt-5-1', title: 'Undergo medical check & chest X-ray for food handlers', completed: false },
            { id: 'mt-5-2', title: 'Obtain City Health Sanitary Permit card', completed: false },
            { id: 'mt-5-3', title: 'File Mayor Business License at City Hall BPLO desk', completed: false },
          ]
        },
        { 
          title: 'Buy-1-Take-1 Opening Promo', 
          category: 'Launch', 
          status: 'Pending' as const, 
          desc: 'Run 2-day opening buy-1-take-1 promo for students.',
          legal_basis: 'RA 7394 Price Tag & Sales Promotion Law',
          agency: 'DTI Fair Trade Bureau',
          estimated_time: '2 Days',
          estimated_cost: '₱2,000 Promo Budget',
          required_docs: ['Promo Tarpaulin Banner'],
          sub_steps: [
            { id: 'mt-6-1', title: 'Hang Grand Opening Buy-1-Take-1 Tarpaulin Banner', completed: false },
            { id: 'mt-6-2', title: 'Distribute discount flyers at nearby schools & tricycle terminals', completed: false },
            { id: 'mt-6-3', title: 'Conduct soft opening launch to test cup sealing speed', completed: false },
          ]
        },
      ],
    },
    {
      title: 'Sari-Sari Store & GCash Cash-In Hub',
      budget: '₱10,000 – ₱25,000',
      tasksCount: '5 Legal & Retail Steps',
      desc: 'Neighborhood retail store with GCash, Maya cash-in & load services.',
      tasks: [
        { 
          title: 'Barangay Micro-Business Permit', 
          category: 'Permits', 
          status: 'Pending' as const, 
          desc: 'Apply at Barangay Hall for Sari-sari store clearance.',
          legal_basis: 'RA 9178 BMBE Act & RA 7160',
          agency: 'Barangay Hall BPLO',
          estimated_time: '1 Day',
          estimated_cost: '₱300',
          required_docs: ['Valid ID', 'Cedula'],
          sub_steps: [
            { id: 'ss-1-1', title: 'Submit Barangay Business Clearance application', completed: false },
            { id: 'ss-1-2', title: 'Pay Barangay store permit fee', completed: false },
            { id: 'ss-1-3', title: 'Post Barangay clearance near store window', completed: false },
          ]
        },
        { 
          title: 'Build Display Shelves & Security Grill', 
          category: 'Supplies', 
          status: 'Pending' as const, 
          desc: 'Setup secure store window and inventory shelves.',
          legal_basis: 'Local Building Code & Security Ordinance',
          agency: 'Local Contractor / Hardware',
          estimated_time: '2 Days',
          estimated_cost: '₱3,500',
          required_docs: ['Store Layout Plan'],
          sub_steps: [
            { id: 'ss-2-1', title: 'Install sturdy wooden multi-tier wall shelves', completed: false },
            { id: 'ss-2-2', title: 'Setup metal security screen window with lock', completed: false },
            { id: 'ss-2-3', title: 'Install glass container jars for candies and snacks', completed: false },
          ]
        },
        { 
          title: 'Wholesale Grocery Procurement', 
          category: 'Supplies', 
          status: 'Pending' as const, 
          desc: 'Stock fast-moving canned goods, instant noodles, and snacks.',
          legal_basis: 'Standard Commercial Wholesale Sourcing',
          agency: 'Wholesale Supermarket / Public Market',
          estimated_time: '1 Day',
          estimated_cost: '₱8,000',
          required_docs: ['Grocery Sourcing List'],
          sub_steps: [
            { id: 'ss-3-1', title: 'Purchase wholesale canned goods (sardines, corned beef)', completed: false },
            { id: 'ss-3-2', title: 'Buy bulk instant noodles, sachet shampoo, and laundry soap', completed: false },
            { id: 'ss-3-3', title: 'Stock soft drinks & chilled bottled water in freezer', completed: false },
          ]
        },
        { 
          title: 'Setup GCash & Load Merchant Account', 
          category: 'Finance', 
          status: 'Pending' as const, 
          desc: 'Verify GCash fully-verified account for cash-in service fees.',
          legal_basis: 'BSP E-Money & Merchant Regulations',
          agency: 'GCash / Maya Merchant Division',
          estimated_time: '1 Day',
          estimated_cost: 'Free',
          required_docs: ['Valid ID', 'GCash Merchant QR'],
          sub_steps: [
            { id: 'ss-4-1', title: 'Upgrade GCash account to Fully Verified status', completed: false },
            { id: 'ss-4-2', title: 'Print GCash QR Code standee for cash-in / cash-out', completed: false },
            { id: 'ss-4-3', title: 'Establish 2% service fee schedule for cash transactions', completed: false },
          ]
        },
        { 
          title: 'Grand Neighborhood Opening', 
          category: 'Launch', 
          status: 'Pending' as const, 
          desc: 'Announce store opening to neighbors.',
          legal_basis: 'RA 7394 Consumer Act (Price Tag Law)',
          agency: 'Local Neighborhood Community',
          estimated_time: '1 Day',
          estimated_cost: '₱500',
          required_docs: ['Price Tag Signage'],
          sub_steps: [
            { id: 'ss-5-1', title: 'Label clear price tags on all store items', completed: false },
            { id: 'ss-5-2', title: 'Open store window at 6:00 AM for early morning commuters', completed: false },
          ]
        },
      ],
    },
  ];

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
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Roadmap</Text>
              <View style={styles.headerMetaRow}>
                <Store size={12} color={LikhoraColors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.headerMetaText} numberOfLines={1}>
                  {userProfile?.business_name || 'My Business'} • {userProfile?.location || 'Philippines'}
                </Text>
              </View>
            </View>

            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>{progressPercent}% Done</Text>
            </View>
          </View>
        </View>

        {/* Overall Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        <TouchableOpacity style={styles.customTaskButton} onPress={() => setShowCustomTaskModal(true)} activeOpacity={0.8}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.customTaskButtonText}>Add custom business task</Text>
        </TouchableOpacity>

        {/* 2. SEGMENTED CONTROL & CATEGORY FILTERS */}
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

        {!showTemplates && (
          <View style={styles.categoryFilterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(['All', 'Permits', 'Supplies', 'Finance', 'Launch'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    activeCategory === cat && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    setActiveCategory(cat);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      activeCategory === cat && styles.filterChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 3. TEMPLATE EXPLORER OR TASK LIST */}
        {showTemplates ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeaderTitle}>Startup Roadmap Templates</Text>
            <Text style={styles.sectionSubTitle}>
              Switch to a pre-built roadmap template based on real Philippine legal & business requirements.
            </Text>

            {STARTUP_TEMPLATES.map((tmpl, idx) => (
              <View key={idx} style={styles.templateCard}>
                <View style={styles.templateCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.templateTitle}>{tmpl.title}</Text>
                    <Text style={styles.templateMeta}>{tmpl.budget} • {tmpl.tasksCount}</Text>
                  </View>
                  <View style={styles.templateBadge}>
                    <Bookmark size={14} color={LikhoraColors.primary} />
                  </View>
                </View>

                <Text style={styles.templateDesc}>{tmpl.desc}</Text>

                <TouchableOpacity
                  style={styles.startTemplateBtn}
                  onPress={() => handleStartTemplate(tmpl.title, tmpl.tasks)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.startTemplateBtnText}>Start This Roadmap</Text>
                  <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={LikhoraColors.primary} />
            <Text style={styles.loadingText}>Loading your custom legal roadmap...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* If 100% Completed, Show Completion Banner */}
            {progressPercent === 100 && (
              <View style={styles.completionBanner}>
                <Sparkles size={24} color={LikhoraColors.successGreen} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.completionTitle}>Roadmap Completed! 🎉</Text>
                  <Text style={styles.completionSub}>
                    Congratulations on completing your legal business launch checklist! Explore other startup templates below to expand.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.exploreBannerBtn}
                  onPress={() => setShowTemplates(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.exploreBannerBtnText}>Explore Templates</Text>
                </TouchableOpacity>
              </View>
            )}

            {filteredTasks.map((rawTask, idx) => {
              const task = ensureSubSteps(rawTask);
              const taskIdKey = task.id || task.title || `task-${idx}`;
              const isCompleted = task.status === 'Completed';

              const subSteps = task.sub_steps || [];
              const completedSubSteps = subSteps.filter(s => s.completed).length;
              const subPercent = subSteps.length > 0 ? Math.round((completedSubSteps / subSteps.length) * 100) : 0;

              return (
                <View
                  key={taskIdKey}
                  style={[
                    styles.taskCard,
                    isCompleted && styles.taskCardCompleted,
                  ]}
                >
                  {/* Task Header Row (Tap to open Pop-up Modal) */}
                  <TouchableOpacity
                    style={styles.taskTopRow}
                    onPress={() => setSelectedTaskModal(task)}
                    activeOpacity={0.8}
                  >
                    {/* Main Checkbox */}
                    <TouchableOpacity
                      style={styles.checkboxBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleTaskStatus(task, idx);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={24} color={LikhoraColors.successGreen} />
                      ) : (
                        <Circle size={24} color={LikhoraColors.textPlaceholder} />
                      )}
                    </TouchableOpacity>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={styles.tagRow}>
                        <View style={[styles.categoryBadge, isCompleted ? styles.completedBadge : styles.inProgressBadge]}>
                          <Text style={[styles.categoryBadgeText, isCompleted ? styles.completedBadgeText : styles.inProgressBadgeText]}>
                            {isCompleted ? 'Completed' : 'In Progress'}
                          </Text>
                        </View>
                        <Text style={styles.stepOrderText}>Step {task.step_order || idx + 1}</Text>
                      </View>

                      <Text
                        style={[
                          styles.taskTitle,
                          isCompleted && styles.taskTitleCompleted,
                        ]}
                      >
                        {task.title}
                      </Text>

                      {task.desc ? (
                        <Text style={styles.taskDesc} numberOfLines={2}>
                          {task.desc}
                        </Text>
                      ) : null}

                      {/* Mini Metadata Pills */}
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

                      {/* Sub-step indicator bar */}
                      <View style={styles.subStepIndicatorRow}>
                        <Text style={styles.subStepIndicatorText}>
                          {completedSubSteps}/{subSteps.length} Steps Done
                        </Text>
                        <View style={styles.miniProgressTrack}>
                          <View style={[styles.miniProgressFill, { width: `${subPercent}%` }]} />
                        </View>
                      </View>
                    </View>

                    {/* View Details Arrow Trigger */}
                    <View style={styles.viewDetailBtn}>
                      <ChevronRight size={18} color={LikhoraColors.primary} />
                    </View>
                  </TouchableOpacity>

                  {/* Card Action Trigger Bar */}
                  <View style={styles.cardFooterBar}>
                    <TouchableOpacity
                      style={styles.openPopupBtn}
                      onPress={() => setSelectedTaskModal(task)}
                      activeOpacity={0.8}
                    >
                      <FileText size={13} color={LikhoraColors.primary} style={{ marginRight: 5 }} />
                      <Text style={styles.openPopupBtnText}>View Detailed Legal Guide & Steps</Text>
                      <ArrowRight size={13} color={LikhoraColors.primary} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteTaskBtn}
                      onPress={() => removeTask(task)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${task.title}`}
                      accessibilityHint="Removes this task from your roadmap"
                      hitSlop={6}
                    >
                      <Trash2 size={18} color={LikhoraColors.errorRed} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <Modal
          visible={Boolean(taskPendingDeletion)}
          transparent
          animationType="fade"
          onRequestClose={() => setTaskPendingDeletion(null)}
        >
          <View style={[styles.popupOverlay, styles.deleteConfirmOverlay]}>
            <View style={[styles.customTaskModal, styles.deleteConfirmModal]}>
              <Text style={styles.customTaskModalTitle}>Delete task?</Text>
              <Text style={styles.customTaskModalSub}>
                Remove “{taskPendingDeletion?.title}” from your roadmap? This cannot be undone.
              </Text>
              <View style={styles.customTaskActions}>
                <TouchableOpacity style={styles.customTaskCancel} onPress={() => setTaskPendingDeletion(null)}>
                  <Text style={styles.customTaskCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteConfirmButton} onPress={confirmRemoveTask}>
                  <Trash2 size={16} color="#FFFFFF" />
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showCustomTaskModal} transparent animationType="slide" onRequestClose={() => setShowCustomTaskModal(false)}>
          <View style={styles.popupOverlay}>
            <View style={styles.customTaskModal}>
              <Text style={styles.customTaskModalTitle}>New custom business task</Text>
              <Text style={styles.customTaskModalSub}>Add a task for any business idea—even one without an existing template.</Text>
              <TextInput style={styles.customTaskInput} value={customTaskTitle} onChangeText={setCustomTaskTitle} placeholder="Task title" placeholderTextColor={LikhoraColors.textPlaceholder} />
              <TextInput style={styles.customTaskInput} value={customTaskCategory} onChangeText={setCustomTaskCategory} placeholder="Category (e.g. Marketing)" placeholderTextColor={LikhoraColors.textPlaceholder} />
              <TextInput style={[styles.customTaskInput, styles.customTaskDescription]} value={customTaskDescription} onChangeText={setCustomTaskDescription} multiline placeholder="Notes or details (optional)" placeholderTextColor={LikhoraColors.textPlaceholder} />
              <View style={styles.customTaskActions}>
                <TouchableOpacity style={styles.customTaskCancel} onPress={() => setShowCustomTaskModal(false)}><Text style={styles.customTaskCancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.customTaskSave} onPress={createCustomTask}><Text style={styles.customTaskSaveText}>Save task</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  customTaskButton: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    backgroundColor: LikhoraColors.primary,
    borderRadius: Radius.pill,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  customTaskButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    fontFamily: LikhoraFont.fontFamily,
  },
  deleteTaskBtn: {
    width: 42,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginLeft: 8,
    borderRadius: Radius.medium,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteConfirmOverlay: {
    justifyContent: 'center',
    padding: Spacing.four,
  },
  deleteConfirmModal: {
    width: '100%',
  },
  deleteConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: LikhoraColors.errorRed,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.pill,
  },
  deleteConfirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  customTaskModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
  },
  customTaskModalTitle: {
    color: LikhoraColors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  customTaskModalSub: {
    color: LikhoraColors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 14,
    fontFamily: LikhoraFont.fontFamily,
  },
  customTaskInput: {
    borderWidth: 1,
    borderColor: LikhoraColors.border,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  customTaskDescription: {
    height: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  customTaskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  customTaskCancel: { padding: 12 },
  customTaskCancelText: { color: LikhoraColors.primary, fontWeight: '800', fontFamily: LikhoraFont.fontFamily },
  customTaskSave: { backgroundColor: LikhoraColors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: Radius.pill },
  customTaskSaveText: { color: '#FFFFFF', fontWeight: '800', fontFamily: LikhoraFont.fontFamily },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingRight: 8,
  },
  headerMetaText: {
    fontSize: 12,
    color: LikhoraColors.textSecondary,
    fontWeight: '600',
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
  segmentedControlContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2EEE7',
    borderRadius: 14,
    padding: 3,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.two,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#2A2130',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
  segmentTextActive: {
    fontSize: 13,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
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
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.secondaryLavender,
    borderWidth: 1,
    borderColor: LikhoraColors.softPurple,
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
  templateCard: {
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
  },
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
    gap: 10,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: LikhoraColors.border,
  },
  toggleCompleteBtn: {
    flex: 2,
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
});

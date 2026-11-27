import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

import User from '../models/User.js';
import Organization from '../models/Organization.js';
import House from '../models/House.js';
import Family from '../models/Family.js';
import Member from '../models/Member.js';
import Donation from '../models/Donation.js';
import Document from '../models/Document.js';
import Chat from '../models/Chat.js';

// High quality portrait avatars
const MALE_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop&crop=faces&q=80',
];

const FEMALE_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=300&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces&q=80',
];

const SAMPLE_DOCUMENT_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
  'https://images.unsplash.com/photo-1568667256549-094345857637?w=800&q=80',
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
  'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&q=80',
];

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is required.');

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  // 1. Seed or Update Admin, Staff, User accounts
  console.log('--- 1. Seeding User Accounts ---');
  const passwordHash = await bcrypt.hash('Admin@12345678', 12);
  const staffHash = await bcrypt.hash('Staff@12345678', 12);
  const userHash = await bcrypt.hash('Member@12345678', 12);

  const usersToSeed = [
    {
      email: 'admin@katuwal.com',
      name: 'Roshan Katuwal (Admin)',
      role: 'admin',
      passwordHash,
      emailVerified: true,
      isActive: true,
    },
    {
      email: 'staff@katuwal.com',
      name: 'Bikash Katuwal (Staff)',
      role: 'staff',
      passwordHash: staffHash,
      emailVerified: true,
      isActive: true,
    },
    {
      email: 'member@katuwal.com',
      name: 'Suman Katuwal (Member)',
      role: 'user',
      passwordHash: userHash,
      emailVerified: true,
      isActive: true,
    },
  ];

  for (const u of usersToSeed) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      existing.role = u.role;
      existing.passwordHash = u.passwordHash;
      existing.emailVerified = true;
      existing.isActive = true;
      existing.name = u.name;
      await existing.save();
      console.log(`Updated user: ${u.email} (Role: ${u.role})`);
    } else {
      await User.create(u);
      console.log(`Created user: ${u.email} (Role: ${u.role})`);
    }
  }

  // 2. Organization details
  console.log('--- 2. Seeding Organization Branding ---');
  let org = await Organization.findOne();
  if (!org) {
    org = new Organization({ name: 'Katuwal Bansha' });
  }
  org.name = 'Katuwal Bansha';
  org.description = 'कटुवाल वंश समन्वय समिति - Official Family Tree & Heritage Portal';
  org.address = 'Baluwatar, Kathmandu, Nepal';
  org.phone = '+977-1-4412345';
  org.email = 'info@katuwal.com';
  org.website = 'https://client-one-beta-58.vercel.app';
  org.mission = 'To document and preserve the sacred lineage, cultural heritage, and unity of the Katuwal community worldwide.';
  org.vision = 'A connected, self-reliant, and culturally vibrant global Katuwal community across generations.';
  org.registrationNumber = 'KB-2081-01';
  org.establishedDate = new Date('1995-01-01');
  await org.save();
  console.log('Organization updated:', org.name);

  // 3. Houses
  console.log('--- 3. Verifying Houses ---');
  const existingHouses = await House.find();
  console.log(`Found ${existingHouses.length} houses.`);

  // 4. Recreate/Restore the 13 Missing Families
  console.log('--- 4. Restoring Missing Families ---');
  const familyConfigs = [
    {
      _id: '6ac567fa9dedbb83f1da3cee',
      familyName: 'कटुवाल मूल परिवार (तनहुँ)',
      familyNumber: 'F001',
      house: '6ac567f99dedbb83f1da3ced',
      houseIdentifier: 'S1',
      origin: 'तनहुँ',
      currentAddress: 'ब्यास-३, तनहुँ',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca148389ab3bda2d267deb',
      familyName: 'रामप्रसाद कटुवाल परिवार',
      familyNumber: 'F002',
      house: '6aca148289ab3bda2d267dea',
      houseIdentifier: 'S2',
      origin: 'भोजपुर',
      currentAddress: 'काठमाडौं',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca148b89ab3bda2d267df2',
      familyName: 'गीता कटुवाल परिवार',
      familyNumber: 'F003',
      house: '6aca148b89ab3bda2d267df1',
      houseIdentifier: 'S3',
      origin: 'खोटाङ',
      currentAddress: 'ललितपुर',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca149289ab3bda2d267df9',
      familyName: 'कृष्णप्रसाद कटुवाल परिवार',
      familyNumber: 'F004',
      house: '6aca149289ab3bda2d267df8',
      houseIdentifier: 'S4',
      origin: 'धनकुटा',
      currentAddress: 'भक्तपुर',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca149989ab3bda2d267e00',
      familyName: 'धनबहादुर कटुवाल शाखा',
      familyNumber: 'F005',
      house: '6aca149989ab3bda2d267dff',
      houseIdentifier: 'S5',
      origin: 'ओखलढुङ्गा',
      currentAddress: 'कोटेश्वर, काठमाडौं',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca14ba89ab3bda2d267e1d',
      familyName: 'बुवा शर्मा कटुवाल परिवार',
      familyNumber: 'F006',
      house: '6aca14ba89ab3bda2d267e1c',
      houseIdentifier: 'S6',
      origin: 'उदयपुर',
      currentAddress: 'बानेश्वर, काठमाडौं',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca14c989ab3bda2d267e2a',
      familyName: 'ठूलोबुवा कटुवाल शाखा',
      familyNumber: 'F007',
      house: '6aca14c889ab3bda2d267e29',
      houseIdentifier: 'S7',
      origin: 'झापा',
      currentAddress: 'दमक, झापा',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca14d789ab3bda2d267e37',
      familyName: 'विराटनगर कटुवाल परिवार',
      familyNumber: 'F008',
      house: '6aca14d689ab3bda2d267e36',
      houseIdentifier: 'S8',
      origin: 'मोरङ',
      currentAddress: 'विराटनगर-२',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca14e089ab3bda2d267e40',
      familyName: 'पोखरा कटुवाल शाखा',
      familyNumber: 'F009',
      house: '6aca14df89ab3bda2d267e3f',
      houseIdentifier: 'S9',
      origin: 'कास्की',
      currentAddress: 'पोखरा-८, कास्की',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca14e989ab3bda2d267e49',
      familyName: 'धरान कटुवाल परिवार',
      familyNumber: 'F010',
      house: '6aca14e989ab3bda2d267e48',
      houseIdentifier: 'S10',
      origin: 'सुनसरी',
      currentAddress: 'धरान-१२, सुनसरी',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca150089ab3bda2d267e5a',
      familyName: 'हजुरबा कटुवाल स्मृति शाखा',
      familyNumber: 'F011',
      house: '6aca14ff89ab3bda2d267e59',
      houseIdentifier: 'S11',
      origin: 'इलाम',
      currentAddress: 'इलाम-१',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6aca150e89ab3bda2d267e67',
      familyName: 'कटुवाल वंश मूल पुर्खा वंशवृक्ष',
      familyNumber: 'F012',
      house: '6aca150e89ab3bda2d267e66',
      houseIdentifier: 'S12',
      origin: 'पाँचथर',
      currentAddress: 'काठमाडौं',
      clan: 'कश्यप गोत्र',
    },
    {
      _id: '6ad2c252954deb2e3f0ce5a0',
      familyName: 'कमल बहादुर कटुवाल परिवार',
      familyNumber: 'F013',
      house: '6ac567f99dedbb83f1da3ced',
      houseIdentifier: 'S13',
      origin: 'उदयपुर',
      currentAddress: 'गाइघाट-१, उदयपुर',
      clan: 'कश्यप गोत्र',
    },
  ];

  for (const fc of familyConfigs) {
    const existing = await Family.findById(fc._id);
    if (!existing) {
      await Family.create({
        _id: new mongoose.Types.ObjectId(fc._id),
        ...fc,
      });
      console.log(`Restored Family: ${fc.familyName} (${fc._id})`);
    } else {
      existing.familyName = fc.familyName;
      existing.familyNumber = fc.familyNumber;
      existing.houseIdentifier = fc.houseIdentifier;
      existing.origin = fc.origin;
      existing.currentAddress = fc.currentAddress;
      await existing.save();
      console.log(`Updated Family: ${fc.familyName}`);
    }
  }

  // 5. Enhance Members with Photos and Valid Profiles
  console.log('--- 5. Enhancing Members with Photos ---');
  const allMembers = await Member.find();
  console.log(`Found ${allMembers.length} total members in DB.`);

  let maleIndex = 0;
  let femaleIndex = 0;
  let photoUpdated = 0;

  for (const member of allMembers) {
    let updated = false;

    // Assign photo if missing, null, or placeholder
    const isMissingPhoto = !member.photo || 
      member.photo.trim() === '' || 
      !member.photo.startsWith('http') || 
      member.photo.includes('tk8el9bcpu7qmrbedlja');

    if (isMissingPhoto) {
      if (member.gender === 'female') {
        member.photo = FEMALE_AVATARS[femaleIndex % FEMALE_AVATARS.length];
        femaleIndex++;
      } else {
        member.photo = MALE_AVATARS[maleIndex % MALE_AVATARS.length];
        maleIndex++;
      }
      photoUpdated++;
      updated = true;
    }

    // Ensure status
    if (!member.status) {
      member.status = 'active';
      updated = true;
    }
    if (member.isAlive === undefined) {
      member.isAlive = true;
      updated = true;
    }

    if (updated) {
      await member.save();
    }
  }
  console.log(`Assigned/updated photos for ${photoUpdated} members.`);

  // 6. Seed Donations
  console.log('--- 6. Seeding Donations ---');
  const existingDonations = await Donation.countDocuments();
  if (existingDonations < 5) {
    const sampleMembers = allMembers.slice(0, 8);
    const donationEntries = [
      {
        donorType: 'member',
        donorId: sampleMembers[0]?._id,
        donorName: sampleMembers[0]?.name || 'Roshan Katuwal',
        donorPhone: '9841234567',
        donorEmail: 'roshan@katuwal.com',
        amount: 25000,
        paymentMethod: 'bank_transfer',
        category: 'temple',
        receiptNumber: 'REC-2081-001',
        paymentStatus: 'paid',
        remarks: 'कुल मन्दिर निर्माण तथा मर्मत सहयोग',
      },
      {
        donorType: 'member',
        donorId: sampleMembers[1]?._id,
        donorName: sampleMembers[1]?.name || 'रामप्रसाद कटुवाल',
        donorPhone: '9851098765',
        donorEmail: 'ram@katuwal.com',
        amount: 50000,
        paymentMethod: 'qr',
        category: 'education',
        receiptNumber: 'REC-2081-002',
        paymentStatus: 'paid',
        remarks: 'जेहेन्दार छात्रवृत्ति कोष',
      },
      {
        donorType: 'external',
        donorName: 'नेपाल कटुवाल समाज, प्रवास शाखा',
        donorPhone: '9811223344',
        donorEmail: 'pravas@katuwal.org',
        amount: 100000,
        paymentMethod: 'bank_transfer',
        category: 'event',
        receiptNumber: 'REC-2081-003',
        paymentStatus: 'paid',
        remarks: 'महाधिवेशन तथा वंशावली लोकार्पण कार्यक्रम',
      },
      {
        donorType: 'member',
        donorId: sampleMembers[2]?._id,
        donorName: sampleMembers[2]?.name || 'धनबहादुर कटुवाल',
        donorPhone: '9803344556',
        donorEmail: 'dhan@katuwal.com',
        amount: 15000,
        paymentMethod: 'cash',
        category: 'emergency',
        receiptNumber: 'REC-2081-004',
        paymentStatus: 'paid',
        remarks: 'आपतकालीन स्वास्थ्य राहत कोष',
      },
      {
        donorType: 'member',
        donorId: sampleMembers[3]?._id,
        donorName: sampleMembers[3]?.name || 'गीता कटुवाल',
        donorPhone: '9841556677',
        donorEmail: 'gita@katuwal.com',
        amount: 10000,
        paymentMethod: 'qr',
        category: 'general',
        receiptNumber: 'REC-2081-005',
        paymentStatus: 'paid',
        remarks: 'वार्षिक साधारण चन्दा',
      },
      {
        donorType: 'member',
        donorId: sampleMembers[4]?._id,
        donorName: sampleMembers[4]?.name || 'कमल बहादुर कटुवाल',
        donorPhone: '9842112233',
        amount: 30000,
        paymentMethod: 'cheque',
        category: 'temple',
        receiptNumber: 'REC-2081-006',
        paymentStatus: 'paid',
        remarks: 'मन्दिरको घण्टी तथा तोरण स्थापना',
      },
    ];

    await Donation.insertMany(donationEntries);
    console.log(`Seeded ${donationEntries.length} donations.`);
  } else {
    console.log(`Donations already exist (${existingDonations} records).`);
  }

  // 7. Seed Documents
  console.log('--- 7. Seeding Documents ---');
  const existingDocs = await Document.countDocuments();
  if (existingDocs === 0 && allMembers.length > 0) {
    const docEntries = [
      {
        member: allMembers[0]._id,
        documentType: 'citizenship',
        title: 'नागरिकता प्रमाणपत्र (अगाडि)',
        description: 'जिल्ला प्रशासन कार्यालय तनहुँबाट जारी नागरिकता',
        fileUrl: SAMPLE_DOCUMENT_IMAGES[0],
        fileName: 'citizenship_roshan_front.jpg',
        fileSize: 450000,
        mimeType: 'image/jpeg',
        isVerified: true,
      },
      {
        member: allMembers[0]._id,
        documentType: 'educational_certificate',
        title: 'स्नातक तह प्रमाणपत्र',
        description: 'त्रिभुवन विश्वविद्यालय',
        fileUrl: SAMPLE_DOCUMENT_IMAGES[1],
        fileName: 'degree_certificate.jpg',
        fileSize: 620000,
        mimeType: 'image/jpeg',
        isVerified: true,
      },
      {
        member: allMembers[1]?._id || allMembers[0]._id,
        documentType: 'marriage_certificate',
        title: 'विवाह दर्ता प्रमाणपत्र',
        description: 'स्थानीय पञ्जिकाधिकारीको कार्यालय',
        fileUrl: SAMPLE_DOCUMENT_IMAGES[2],
        fileName: 'marriage_cert.jpg',
        fileSize: 380000,
        mimeType: 'image/jpeg',
        isVerified: true,
      },
      {
        member: allMembers[2]?._id || allMembers[0]._id,
        documentType: 'birth_certificate',
        title: 'जन्म दर्ता प्रमाणपत्र',
        description: 'वडा कार्यालयबाट जारी',
        fileUrl: SAMPLE_DOCUMENT_IMAGES[3],
        fileName: 'birth_certificate.jpg',
        fileSize: 310000,
        mimeType: 'image/jpeg',
        isVerified: true,
      },
    ];

    await Document.insertMany(docEntries);
    console.log(`Seeded ${docEntries.length} documents.`);
  } else {
    console.log(`Documents already exist (${existingDocs} records).`);
  }

  // 8. Seed Real-time Chat Messages
  console.log('--- 8. Seeding Chat Messages ---');
  const existingChats = await Chat.countDocuments();
  if (existingChats < 10) {
    const adminUser = await User.findOne({ role: 'admin' });
    const staffUser = await User.findOne({ role: 'staff' });
    const normalUser = await User.findOne({ role: 'user' });

    const chatMessages = [
      // General
      {
        room: 'general',
        sender: adminUser?._id,
        senderName: adminUser?.name || 'Roshan Katuwal',
        senderRole: 'admin',
        message: 'नमस्कार सबै दाजुभाइ तथा दिदीबहिनीहरूमा! कटुवाल वंशको नयाँ डिजिटल पोर्टलमा हार्दिक स्वागत छ। 🙏',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        room: 'general',
        sender: staffUser?._id,
        senderName: staffUser?.name || 'Bikash Katuwal',
        senderRole: 'staff',
        message: 'सबै परिवारहरूले आफ्नो पारिवारिक विवरण तथा वंशवृक्ष जाँच गरी छुट भएका सदस्यहरू थप्न सक्नुहुनेछ।',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        room: 'general',
        sender: normalUser?._id,
        senderName: normalUser?.name || 'Suman Katuwal',
        senderRole: 'user',
        message: 'धेरै राम्रो पहल! पोर्टल एकदमै आधुनिक र सहज बनेको छ। 👏🔥',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },

      // Announcements
      {
        room: 'announcements',
        sender: adminUser?._id,
        senderName: adminUser?.name || 'Roshan Katuwal',
        senderRole: 'admin',
        message: '📢 सूचना: आगामी वैशाख पूर्णिमामा हुने कुलपूजाको तयारी बैठक यही शनिबार बिहान ११ बजे जुममार्फत बस्नेछ। सबै शाखा प्रतिनिधिहरूको उपस्थितिको लागि अनुरोध छ।',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        room: 'announcements',
        sender: staffUser?._id,
        senderName: staffUser?.name || 'Bikash Katuwal',
        senderRole: 'staff',
        message: '📜 वंशवृक्ष पुस्तक २०८१ को पहिलो संस्करण प्रकाशनको लागि अन्तिम प्रुफ हेर्ने काम भइरहेको छ।',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },

      // Family Discussion
      {
        room: 'family_discussion',
        sender: staffUser?._id,
        senderName: staffUser?.name || 'Bikash Katuwal',
        senderRole: 'staff',
        message: 'हाम्रो कश्यप गोत्रीय कटुवालहरूको मूल उद्गमस्थल तथा शाखा विस्तारबारे कुनै ऐतिहासिक प्रमाणहरू भए साझा गरिदिनुहोला।',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        room: 'family_discussion',
        sender: normalUser?._id,
        senderName: normalUser?.name || 'Suman Katuwal',
        senderRole: 'user',
        message: 'मसँग भोजपुर शाखाको पुरानो ताम्रपत्रको फोटोकपी छ, म छिट्टै यहाँ अपलोड गर्नेछु। 👍',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },

      // Events
      {
        room: 'events',
        sender: adminUser?._id,
        senderName: adminUser?.name || 'Roshan Katuwal',
        senderRole: 'admin',
        message: '🎉 आगामी वार्षिक बनभोज तथा भेटघाट कार्यक्रम मिति २०८१ मंसिर २८ गते गोदावरीमा आयोजना गरिने भएको छ।',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },

      // Genealogy Help
      {
        room: 'genealogy_help',
        sender: normalUser?._id,
        senderName: normalUser?.name || 'Suman Katuwal',
        senderRole: 'user',
        message: 'नयाँ जन्मिएका बच्चाहरूको नाम वंशवृक्षमा कसरी जोड्ने होला?',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      },
      {
        room: 'genealogy_help',
        sender: staffUser?._id,
        senderName: staffUser?.name || 'Bikash Katuwal',
        senderRole: 'staff',
        message: 'Data Entry मेनुमा गएर आफ्नो परिवार छानेपछि Add Member बटन थिचेर बच्चाको विवरण र जन्म मिति हाल्न सक्नुहुन्छ।',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
    ];

    await Chat.insertMany(chatMessages);
    console.log(`Seeded ${chatMessages.length} chat messages.`);
  } else {
    console.log(`Chat messages already exist (${existingChats} records).`);
  }

  console.log('==============================================');
  console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('==============================================');
  console.log('Credentials to Log In:');
  console.log('1. Admin: admin@katuwal.com | Password: Admin@12345678');
  console.log('2. Staff: staff@katuwal.com | Password: Staff@12345678');
  console.log('3. Member: member@katuwal.com | Password: Member@12345678');
  console.log('==============================================');
}

seed()
  .catch((err) => {
    console.error('Seeding error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });

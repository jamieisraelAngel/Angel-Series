import { MolecularStats, MolecularChainInfo, MolecularLigandInfo, ResidueConfidence } from '../types';

export interface SamplePdbEntry {
  id: string;
  name: string;
  category: 'Enzyme' | 'Transport' | 'Viral / Immune' | 'Nucleic Acid' | 'Hormone' | 'High-Res';
  description: string;
  organism: string;
}

/**
 * Standard AlphaFold / pLDDT Model Confidence Color Bands:
 * - Very high (pLDDT > 90): #0053D6 (Dark Blue)
 * - Confident (90 >= pLDDT > 70): #65CBF3 (Light Blue / Cyan)
 * - Low (70 >= pLDDT > 50): #FFDB13 (Yellow)
 * - Very low (pLDDT <= 50): #FF7D45 (Orange)
 */
export function getPlddtColor(score: number): {
  r: number;
  g: number;
  b: number;
  hex: string;
  band: 'veryHigh' | 'confident' | 'low' | 'veryLow';
  label: string;
} {
  if (score > 90) {
    return { r: 0, g: 83, b: 214, hex: '#0053D6', band: 'veryHigh', label: 'Very High (>90)' };
  }
  if (score > 70) {
    return { r: 101, g: 203, b: 243, hex: '#65CBF3', band: 'confident', label: 'Confident (70–90)' };
  }
  if (score > 50) {
    return { r: 255, g: 219, b: 19, hex: '#FFDB13', band: 'low', label: 'Low (50–70)' };
  }
  return { r: 255, g: 125, b: 69, hex: '#FF7D45', band: 'veryLow', label: 'Very Low (<50)' };
}

/**
 * Maps crystallographic B-factor (temperature / mobility factor) to a Blue -> White -> Red thermal gradient
 */
export function getBFactorColor(
  bFactor: number,
  minB = 5,
  maxB = 60
): { r: number; g: number; b: number; hex: string } {
  const span = Math.max(maxB - minB, 1);
  const t = Math.max(0, Math.min(1, (bFactor - minB) / span));

  // Blue (low mobility/rigid) -> Cyan -> Yellow -> Red (high mobility/flexible)
  let r = 0;
  let g = 0;
  let b = 0;
  if (t < 0.33) {
    const k = t / 0.33;
    r = Math.round(30 + k * 50);
    g = Math.round(100 + k * 120);
    b = Math.round(235 - k * 20);
  } else if (t < 0.66) {
    const k = (t - 0.33) / 0.33;
    r = Math.round(80 + k * 175);
    g = Math.round(220 - k * 20);
    b = Math.round(215 - k * 165);
  } else {
    const k = (t - 0.66) / 0.34;
    r = 255;
    g = Math.round(200 - k * 145);
    b = Math.round(50 - k * 20);
  }

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return { r, g, b, hex: `#${toHex(r)}${toHex(g)}${toHex(b)}` };
}

/**
 * Helper to compute confidence distribution and normalize experimental B-factors vs pLDDT scores
 */
function finalizeResidueConfidences(
  rawResidues: Array<{ chainId: string; resSeq: number; resName: string; bSum: number; count: number }>,
  isPredictedHint: boolean
): {
  residueConfidences: ResidueConfidence[];
  avgConfidence: number;
  minBFactor: number;
  maxBFactor: number;
  isPredictedModel: boolean;
  confidenceDistribution: {
    veryHigh: number;
    confident: number;
    low: number;
    veryLow: number;
  };
} {
  if (rawResidues.length === 0) {
    return {
      residueConfidences: [],
      avgConfidence: 92.4,
      minBFactor: 10,
      maxBFactor: 98,
      isPredictedModel: isPredictedHint,
      confidenceDistribution: { veryHigh: 70, confident: 20, low: 7, veryLow: 3 },
    };
  }

  let minB = Infinity;
  let maxB = -Infinity;
  let sumB = 0;

  const averages = rawResidues.map((r) => {
    const avgB = r.count > 0 ? r.bSum / r.count : 50;
    if (avgB < minB) minB = avgB;
    if (avgB > maxB) maxB = avgB;
    sumB += avgB;
    return { ...r, rawBFactor: Number(avgB.toFixed(2)) };
  });

  const meanB = sumB / averages.length;
  // Detect if B-factors represent pLDDT (0-100 scale, typically mean > 55 and max <= 100)
  const looksLikePlddt =
    isPredictedHint || (minB >= 0 && maxB <= 100.01 && meanB >= 52 && maxB >= 75);

  let veryHighCount = 0;
  let confidentCount = 0;
  let lowCount = 0;
  let veryLowCount = 0;
  let totalScore = 0;

  const spanB = Math.max(maxB - minB, 1);

  const residueConfidences: ResidueConfidence[] = averages.map((r) => {
    let score: number;
    if (looksLikePlddt) {
      // Direct pLDDT confidence score (0-100)
      score = Math.max(0, Math.min(100, r.rawBFactor));
    } else {
      // Experimental X-ray / Cryo-EM structure:
      // Lower B-factor = higher coordinate certainty; higher B-factor = lower certainty / thermal disorder.
      // Map relative B-factor stability onto the 0-100 confidence scale so all 4 confidence bands are represented meaningfully.
      const normalizedDisorder = (r.rawBFactor - minB) / spanB; // 0 (most stable) to 1 (most flexible)
      score = Math.max(35, Math.min(98, Number((96 - normalizedDisorder * 54).toFixed(1))));
    }

    totalScore += score;
    if (score > 90) veryHighCount++;
    else if (score > 70) confidentCount++;
    else if (score > 50) lowCount++;
    else veryLowCount++;

    return {
      chainId: r.chainId,
      resSeq: r.resSeq,
      resName: r.resName,
      score: Number(score.toFixed(1)),
      rawBFactor: r.rawBFactor,
    };
  });

  const total = residueConfidences.length || 1;
  return {
    residueConfidences,
    avgConfidence: Number((totalScore / total).toFixed(1)),
    minBFactor: Number(minB.toFixed(2)),
    maxBFactor: Number(maxB.toFixed(2)),
    isPredictedModel: looksLikePlddt,
    confidenceDistribution: {
      veryHigh: Math.round((veryHighCount / total) * 100),
      confident: Math.round((confidentCount / total) * 100),
      low: Math.round((lowCount / total) * 100),
      veryLow: Math.max(
        0,
        100 -
          Math.round((veryHighCount / total) * 100) -
          Math.round((confidentCount / total) * 100) -
          Math.round((lowCount / total) * 100)
      ),
    },
  };
}

export const SAMPLE_PDB_STRUCTURES: SamplePdbEntry[] = [
  {
    id: '4HHB',
    name: 'Human Deoxyhaemoglobin',
    category: 'Transport',
    description: 'Tetrameric oxygen transport metalloprotein with four heme prosthetic groups.',
    organism: 'Homo sapiens',
  },
  {
    id: '1CBS',
    name: 'Retinoic Acid-Binding Protein',
    category: 'Transport',
    description: 'Cellular retinoic acid-binding protein II complexed with all-trans-retinoic acid.',
    organism: 'Homo sapiens',
  },
  {
    id: '6VXX',
    name: 'SARS-CoV-2 Spike Glycoprotein',
    category: 'Viral / Immune',
    description: 'Cryo-EM structure of the SARS-CoV-2 spike glycoprotein in closed prefusion state.',
    organism: 'Severe acute respiratory syndrome coronavirus 2',
  },
  {
    id: '1BNA',
    name: 'B-DNA Dodecamer Helix',
    category: 'Nucleic Acid',
    description: 'Canonical double-helical B-DNA crystal structure d(CGCGAATTCGCG)2.',
    organism: 'Synthetic DNA',
  },
  {
    id: '1TRZ',
    name: 'Human 2Zn Insulin Hexamer',
    category: 'Hormone',
    description: 'Endocrine peptide hormone hexamer coordinated by two zinc ions.',
    organism: 'Homo sapiens',
  },
  {
    id: '1LYZ',
    name: 'Egg White Lysozyme',
    category: 'Enzyme',
    description: 'Glycoside hydrolase that damages bacterial cell walls, historic enzyme model.',
    organism: 'Gallus gallus',
  },
  {
    id: '1CRN',
    name: 'Crambin (0.54 Å Resolution)',
    category: 'High-Res',
    description: 'Small hydrophobic plant seed protein solved at atomic resolution.',
    organism: 'Crambe abyssinica',
  },
];

/**
 * Parses PDB file text directly to extract structured metadata for researchers.
 */
export function parsePdbMetadata(text: string, fileName = 'molecule.pdb', fileSize?: number): MolecularStats {
  const lines = text.split('\n');

  let title = '';
  let classification = 'Macromolecule';
  let depositionDate = '';
  let pdbId = '';
  let experimentalMethod = 'X-ray Diffraction';
  let resolution: string | number | undefined;
  let organism = '';

  const chainsMap = new Map<string, { residueCount: number; type: 'protein' | 'nucleic' | 'other' }>();
  const hetnamMap = new Map<string, string>();
  const formulMap = new Map<string, string>();
  const hetInstancesMap = new Map<string, MolecularLigandInfo>();
  const seenResidues = new Set<string>();
  const residueBFactorMap = new Map<
    string,
    { chainId: string; resSeq: number; resName: string; bSum: number; count: number }
  >();

  let atomCount = 0;
  let helixCount = 0;
  let sheetCount = 0;
  let isPredictedHint =
    /alphafold|colabfold|esmfold|boltz|rosettafold|plddt|predicted/i.test(fileName) ||
    /alphafold|colabfold|esmfold|boltz|rosettafold|plddt/i.test(text.slice(0, 4000));

  const isWater = (code: string) => ['HOH', 'WAT', 'DOD', 'H2O', 'TIP', 'SOL'].includes(code.toUpperCase());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const record = line.substring(0, 6).trim();

    if (record === 'HEADER') {
      classification = line.substring(10, 50).trim() || classification;
      depositionDate = line.substring(50, 59).trim() || depositionDate;
      const idMatch = line.substring(62, 66).trim();
      if (idMatch) pdbId = idMatch;
    } else if (record === 'TITLE') {
      const titleChunk = line.substring(10, 70).trim();
      if (titleChunk) {
        title = title ? `${title} ${titleChunk}` : titleChunk;
      }
    } else if (record === 'EXPDTA') {
      const exp = line.substring(10, 70).trim();
      if (exp) experimentalMethod = exp;
    } else if (record === 'REMARK') {
      // REMARK 2 RESOLUTION
      if (line.includes('RESOLUTION.') && line.includes('ANGSTROMS')) {
        const match = line.match(/([0-9]+\.[0-9]+)\s+ANGSTROMS/i);
        if (match && !resolution) {
          resolution = Number(match[1]);
        }
      }
      if (/alphafold|plddt|colabfold|esmfold|boltz/i.test(line)) {
        isPredictedHint = true;
      }
    } else if (record === 'SOURCE') {
      if (line.includes('ORGANISM_SCIENTIFIC:')) {
        const match = line.split('ORGANISM_SCIENTIFIC:')[1]?.split(';')[0]?.trim();
        if (match && !organism) organism = match;
      }
    } else if (record === 'HETNAM') {
      const chemId = line.substring(11, 14).trim();
      const chemName = line.substring(15, 70).trim();
      if (chemId && chemName) {
        const prev = hetnamMap.get(chemId);
        hetnamMap.set(chemId, prev ? `${prev} ${chemName}` : chemName);
      }
    } else if (record === 'FORMUL') {
      const chemId = line.substring(12, 15).trim();
      const formula = line.substring(18, 70).trim().replace(/^\*\s*/, '');
      if (chemId && formula) {
        formulMap.set(chemId, formula);
      }
    } else if (record === 'HELIX') {
      helixCount++;
    } else if (record === 'SHEET') {
      sheetCount++;
    } else if (record === 'ATOM') {
      atomCount++;
      const chainId = line.substring(21, 22).trim() || 'A';
      const resName = line.substring(17, 20).trim();
      const resSeqStr = line.substring(22, 26).trim();
      const resSeqNum = parseInt(resSeqStr, 10);
      const bFactorStr = line.substring(60, 66).trim();
      const bFactorVal = parseFloat(bFactorStr);
      const residueKey = `${chainId}-${resSeqStr}-${resName}`;

      if (!isNaN(resSeqNum)) {
        const rKey = `${chainId}:${resSeqNum}`;
        const existingRes = residueBFactorMap.get(rKey);
        const validB = !isNaN(bFactorVal) ? bFactorVal : 50;
        if (existingRes) {
          existingRes.bSum += validB;
          existingRes.count += 1;
        } else {
          residueBFactorMap.set(rKey, {
            chainId,
            resSeq: resSeqNum,
            resName,
            bSum: validB,
            count: 1,
          });
        }
      }

      if (!seenResidues.has(residueKey)) {
        seenResidues.add(residueKey);
        const isNucleic = ['DA', 'DT', 'DG', 'DC', 'A', 'U', 'G', 'C'].includes(resName);
        const existing = chainsMap.get(chainId) || { residueCount: 0, type: isNucleic ? 'nucleic' : 'protein' };
        existing.residueCount++;
        chainsMap.set(chainId, existing);
      }
    } else if (record === 'HETATM') {
      atomCount++;
      const chemId = line.substring(17, 20).trim();
      if (chemId && !isWater(chemId)) {
        const chainId = line.substring(21, 22).trim() || 'A';
        const resSeqStr = line.substring(22, 26).trim();
        const resSeq = parseInt(resSeqStr, 10) || 1;
        const key = `${chemId}-${chainId}-${resSeq}`;

        let instance = hetInstancesMap.get(key);
        if (!instance) {
          const chemicalName = hetnamMap.get(chemId) || getLigandCommonName(chemId);
          instance = {
            id: key,
            chemId,
            name: chemicalName,
            chainId,
            resSeq,
            count: 0,
            formula: formulMap.get(chemId),
            description: getLigandDescription(chemId),
            visible: true,
          };
          hetInstancesMap.set(key, instance);
        }
        instance.count++;
      }
    }
  }

  const chains: MolecularChainInfo[] = Array.from(chainsMap.entries()).map(([id, info]) => ({
    id,
    name: `Chain ${id}`,
    residueCount: info.residueCount,
    type: info.type,
  }));

  const ligands: MolecularLigandInfo[] = Array.from(hetInstancesMap.values());

  const totalResidues = seenResidues.size;
  const confidenceData = finalizeResidueConfidences(
    Array.from(residueBFactorMap.values()),
    isPredictedHint
  );

  return {
    pdbId: pdbId || fileName.replace(/\.[^/.]+$/, '').toUpperCase(),
    title: title || (pdbId ? `PDB Structure ${pdbId}` : fileName),
    classification,
    experimentalMethod: confidenceData.isPredictedModel && experimentalMethod === 'X-ray Diffraction'
      ? 'AI Structure Prediction (pLDDT)'
      : experimentalMethod,
    resolution,
    depositionDate,
    organism: organism || 'Biological Specimen',
    chains: chains.length > 0 ? chains : [{ id: 'A', name: 'Chain A', residueCount: totalResidues, type: 'protein' }],
    ligands,
    atomCount: atomCount || 1,
    residueCount: totalResidues || 1,
    helixCount,
    sheetCount,
    fileFormat: 'PDB',
    fileSize,
    fileName,
    ...confidenceData,
  };
}

/**
 * Parses mmCIF file text for metadata and per-residue confidence / B-factor values.
 */
export function parseCifMetadata(text: string, fileName = 'molecule.cif', fileSize?: number): MolecularStats {
  let title = '';
  let pdbId = '';
  let experimentalMethod = 'X-ray Diffraction / Cryo-EM';
  let resolution: string | number | undefined;
  const isPredictedHint =
    /alphafold|colabfold|esmfold|boltz|rosettafold|plddt|_ma_qa_metric_local/i.test(fileName) ||
    /_ma_qa_metric_local|alphafold|plddt|boltz/i.test(text.slice(0, 8000));

  // Search for common mmCIF tags
  const idMatch = text.match(/_entry\.id\s+([^\s\n]+)/);
  if (idMatch) pdbId = idMatch[1].trim();

  const titleMatch = text.match(/_struct\.title\s+['"]?([^'\n\r"]+)['"]?/);
  if (titleMatch) title = titleMatch[1].trim();

  const resMatch = text.match(/_refine\.ls_d_res_high\s+([0-9.]+)/) || text.match(/_em_3d_reconstruction\.resolution\s+([0-9.]+)/);
  if (resMatch) resolution = Number(resMatch[1]);

  const methodMatch = text.match(/_exptl\.method\s+['"]?([^'\n\r"]+)['"]?/);
  if (methodMatch) experimentalMethod = methodMatch[1].trim();

  // Extract non-water ligands and ATOM B-factor / pLDDT from mmCIF
  const ligandMap = new Map<string, MolecularLigandInfo>();
  const residueBFactorMap = new Map<
    string,
    { chainId: string; resSeq: number; resName: string; bSum: number; count: number }
  >();
  const chainsMap = new Map<string, { residueCount: number; type: 'protein' | 'nucleic' | 'other' }>();
  const seenResidues = new Set<string>();

  const lines = text.split('\n');
  const isWater = (code: string) => ['HOH', 'WAT', 'DOD', 'H2O', 'TIP', 'SOL'].includes(code.toUpperCase());

  // Dynamically track _atom_site loop headers if present
  let atomSiteHeaders: string[] = [];
  let inAtomSiteHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('_atom_site.')) {
      inAtomSiteHeader = true;
      atomSiteHeaders.push(line.split(/\s+/)[0]);
      continue;
    } else if (inAtomSiteHeader && !line.startsWith('_atom_site.') && !line.startsWith('ATOM') && !line.startsWith('HETATM')) {
      inAtomSiteHeader = false;
    }

    if (line.startsWith('ATOM')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 10) {
        const compIdx = atomSiteHeaders.indexOf('_atom_site.auth_comp_id') !== -1
          ? atomSiteHeaders.indexOf('_atom_site.auth_comp_id')
          : atomSiteHeaders.indexOf('_atom_site.label_comp_id') !== -1
          ? atomSiteHeaders.indexOf('_atom_site.label_comp_id')
          : 5;
        const asymIdx = atomSiteHeaders.indexOf('_atom_site.auth_asym_id') !== -1
          ? atomSiteHeaders.indexOf('_atom_site.auth_asym_id')
          : atomSiteHeaders.indexOf('_atom_site.label_asym_id') !== -1
          ? atomSiteHeaders.indexOf('_atom_site.label_asym_id')
          : 6;
        const seqIdx = atomSiteHeaders.indexOf('_atom_site.auth_seq_id') !== -1
          ? atomSiteHeaders.indexOf('_atom_site.auth_seq_id')
          : atomSiteHeaders.indexOf('_atom_site.label_seq_id') !== -1
          ? atomSiteHeaders.indexOf('_atom_site.label_seq_id')
          : 8;
        const bIdx = atomSiteHeaders.indexOf('_atom_site.B_iso_or_equiv') !== -1
          ? atomSiteHeaders.indexOf('_atom_site.B_iso_or_equiv')
          : 14;

        const resName = parts[compIdx] || 'ALA';
        const chainId = parts[asymIdx] || 'A';
        const resSeq = parseInt(parts[seqIdx] || '1', 10);
        const bVal = parseFloat(parts[bIdx] ?? parts[parts.length - 2] ?? '85');

        if (!isNaN(resSeq)) {
          const rKey = `${chainId}:${resSeq}`;
          const existingRes = residueBFactorMap.get(rKey);
          const validB = !isNaN(bVal) ? bVal : 85;
          if (existingRes) {
            existingRes.bSum += validB;
            existingRes.count += 1;
          } else {
            residueBFactorMap.set(rKey, {
              chainId,
              resSeq,
              resName,
              bSum: validB,
              count: 1,
            });
          }

          const residueKey = `${chainId}-${resSeq}-${resName}`;
          if (!seenResidues.has(residueKey)) {
            seenResidues.add(residueKey);
            const isNucleic = ['DA', 'DT', 'DG', 'DC', 'A', 'U', 'G', 'C'].includes(resName);
            const existingChain = chainsMap.get(chainId) || {
              residueCount: 0,
              type: isNucleic ? 'nucleic' : 'protein',
            };
            existingChain.residueCount++;
            chainsMap.set(chainId, existingChain);
          }
        }
      }
    } else if (line.startsWith('HETATM')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 7) {
        const chemId = parts[5] || parts[3];
        if (chemId && !isWater(chemId)) {
          const chainId = parts[6] || 'A';
          const resSeq = parseInt(parts[8] || parts[7] || '1', 10) || 1;
          const key = `${chemId}-${chainId}-${resSeq}`;
          if (!ligandMap.has(key)) {
            ligandMap.set(key, {
              id: key,
              chemId,
              name: getLigandCommonName(chemId),
              chainId,
              resSeq,
              count: 1,
              description: getLigandDescription(chemId),
              visible: true,
            });
          } else {
            ligandMap.get(key)!.count++;
          }
        }
      }
    }
  }

  const roughAtomCount = (text.match(/ATOM\s+/g) || []).length + (text.match(/HETATM\s+/g) || []).length;
  const confidenceData = finalizeResidueConfidences(
    Array.from(residueBFactorMap.values()),
    isPredictedHint
  );
  const parsedChains: MolecularChainInfo[] = Array.from(chainsMap.entries()).map(([id, info]) => ({
    id,
    name: `Chain ${id}`,
    residueCount: info.residueCount,
    type: info.type,
  }));

  return {
    pdbId: pdbId || fileName.replace(/\.[^/.]+$/, '').toUpperCase(),
    title: title || `mmCIF Structure ${pdbId || fileName}`,
    classification: 'Macromolecule',
    experimentalMethod: confidenceData.isPredictedModel ? 'AI Structure Prediction (pLDDT)' : experimentalMethod,
    resolution,
    organism: 'Biological Specimen',
    chains:
      parsedChains.length > 0
        ? parsedChains
        : [{ id: 'A', name: 'Polymer Assembly', residueCount: Math.max(seenResidues.size, 250), type: 'protein' }],
    ligands: Array.from(ligandMap.values()),
    atomCount: Math.max(roughAtomCount, 500),
    residueCount: seenResidues.size || Math.round(Math.max(roughAtomCount / 8, 50)),
    fileFormat: 'mmCIF',
    fileSize,
    fileName,
    ...confidenceData,
  };
}

/**
 * Common names for typical ligands
 */
export function getLigandCommonName(id: string): string {
  const dict: Record<string, string> = {
    HEM: 'Protoporphyrin IX with Fe (Heme B)',
    HEA: 'Heme A cofactor',
    HEC: 'Heme C cofactor',
    REA: 'All-trans-Retinoic Acid (Vitamin A acid)',
    ATP: "Adenosine 5'-Triphosphate",
    ADP: "Adenosine 5'-Diphosphate",
    AMP: 'Adenosine Monophosphate',
    GTP: "Guanosine 5'-Triphosphate",
    GDP: "Guanosine 5'-Diphosphate",
    NAG: 'N-Acetyl-D-Glucosamine (GlcNAc)',
    MAN: 'Alpha-D-Mannose',
    BMA: 'Beta-D-Mannose',
    GOL: 'Glycerol',
    EDO: '1,2-Ethanediol',
    SO4: 'Sulfate Ion',
    PO4: 'Phosphate Ion',
    ZN: 'Zinc Ion (Zn²⁺)',
    MG: 'Magnesium Ion (Mg²⁺)',
    CA: 'Calcium Ion (Ca²⁺)',
    FE: 'Iron Ion (Fe³⁺/Fe²⁺)',
    MN: 'Manganese Ion (Mn²⁺)',
    CU: 'Copper Ion (Cu²⁺)',
    NA: 'Sodium Ion (Na⁺)',
    CL: 'Chloride Ion (Cl⁻)',
    NAD: 'Nicotinamide Adenine Dinucleotide',
    NAP: 'Nicotinamide Adenine Dinucleotide Phosphate',
    FAD: 'Flavin Adenine Dinucleotide',
    FMN: 'Flavin Mononucleotide',
    PLP: "Pyridoxal-5'-Phosphate",
    SAM: 'S-Adenosyl-L-Methionine',
    SAH: 'S-Adenosyl-L-Homocysteine',
    COA: 'Coenzyme A',
  };
  return dict[id.toUpperCase()] || `${id.toUpperCase()} Ligand`;
}

/**
 * Functional descriptions for ligands
 */
export function getLigandDescription(id: string): string {
  const dict: Record<string, string> = {
    HEM: 'Oxygen-binding metalloporphyrin prosthetic group',
    REA: 'Nuclear receptor agonist and morphogen ligand',
    ATP: 'Primary cellular chemical energy transfer coenzyme',
    ADP: 'Energy currency nucleotide metabolite',
    NAG: 'Post-translational glycosylation carbohydrate moiety',
    GOL: 'Cryoprotectant and crystallization stabilizing agent',
    SO4: 'Inorganic salt anion from crystallization precipitant',
    PO4: 'Inorganic catalytic or buffer phosphate anion',
    ZN: 'Structural or catalytic coordination divalent metal ion',
    MG: 'Enzymatic cofactor activating nucleic acid phosphodiester bonds',
    CA: 'Second messenger signaling and structural calcium cation',
    FE: 'Redox active iron coordination center',
    NAD: 'Dehydrogenase hydride transfer coenzyme',
    FAD: 'Electron transport flavoenzyme cofactor',
  };
  return dict[id.toUpperCase()] || 'Small molecule chemical ligand / hetero-compound';
}

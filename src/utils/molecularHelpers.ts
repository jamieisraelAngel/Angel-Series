import { MolecularStats, MolecularChainInfo, MolecularLigandInfo } from '../types';

export interface SamplePdbEntry {
  id: string;
  name: string;
  category: 'Enzyme' | 'Transport' | 'Viral / Immune' | 'Nucleic Acid' | 'Hormone' | 'High-Res';
  description: string;
  organism: string;
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
  const ligandsMap = new Map<string, { count: number; name: string }>();
  const seenResidues = new Set<string>();

  let atomCount = 0;
  let helixCount = 0;
  let sheetCount = 0;

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
    } else if (record === 'SOURCE') {
      if (line.includes('ORGANISM_SCIENTIFIC:')) {
        const match = line.split('ORGANISM_SCIENTIFIC:')[1]?.split(';')[0]?.trim();
        if (match && !organism) organism = match;
      }
    } else if (record === 'HELIX') {
      helixCount++;
    } else if (record === 'SHEET') {
      sheetCount++;
    } else if (record === 'ATOM') {
      atomCount++;
      const chainId = line.substring(21, 22).trim() || 'A';
      const resName = line.substring(17, 20).trim();
      const resSeq = line.substring(22, 26).trim();
      const residueKey = `${chainId}-${resSeq}-${resName}`;

      if (!seenResidues.has(residueKey)) {
        seenResidues.add(residueKey);
        const isNucleic = ['DA', 'DT', 'DG', 'DC', 'A', 'U', 'G', 'C'].includes(resName);
        const existing = chainsMap.get(chainId) || { residueCount: 0, type: isNucleic ? 'nucleic' : 'protein' };
        existing.residueCount++;
        chainsMap.set(chainId, existing);
      }
    } else if (record === 'HETATM') {
      atomCount++;
      const hetName = line.substring(17, 20).trim();
      // Skip water (HOH, WAT) from ligand list or note separately
      if (hetName && hetName !== 'HOH' && hetName !== 'WAT') {
        const existing = ligandsMap.get(hetName) || { count: 0, name: hetName };
        existing.count++;
        ligandsMap.set(hetName, existing);
      }
    }
  }

  const chains: MolecularChainInfo[] = Array.from(chainsMap.entries()).map(([id, info]) => ({
    id,
    name: `Chain ${id}`,
    residueCount: info.residueCount,
    type: info.type,
  }));

  const ligands: MolecularLigandInfo[] = Array.from(ligandsMap.entries()).map(([id, info]) => ({
    id,
    name: info.name,
    count: info.count,
    description: getLigandCommonName(id),
  }));

  const totalResidues = seenResidues.size;

  return {
    pdbId: pdbId || fileName.replace(/\.[^/.]+$/, '').toUpperCase(),
    title: title || (pdbId ? `PDB Structure ${pdbId}` : fileName),
    classification,
    experimentalMethod,
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
  };
}

/**
 * Parses mmCIF file text for metadata.
 */
export function parseCifMetadata(text: string, fileName = 'molecule.cif', fileSize?: number): MolecularStats {
  let title = '';
  let pdbId = '';
  let experimentalMethod = 'X-ray Diffraction / Cryo-EM';
  let resolution: string | number | undefined;

  // Search for common mmCIF tags
  const idMatch = text.match(/_entry\.id\s+([^\s\n]+)/);
  if (idMatch) pdbId = idMatch[1].trim();

  const titleMatch = text.match(/_struct\.title\s+['"]?([^'\n\r"]+)['"]?/);
  if (titleMatch) title = titleMatch[1].trim();

  const resMatch = text.match(/_refine\.ls_d_res_high\s+([0-9.]+)/) || text.match(/_em_3d_reconstruction\.resolution\s+([0-9.]+)/);
  if (resMatch) resolution = Number(resMatch[1]);

  const methodMatch = text.match(/_exptl\.method\s+['"]?([^'\n\r"]+)['"]?/);
  if (methodMatch) experimentalMethod = methodMatch[1].trim();

  // Count atoms roughly
  const atomMatches = text.match(/_atom_site\./g);
  const roughAtomCount = (text.match(/ATOM\s+/g) || []).length + (text.match(/HETATM\s+/g) || []).length;

  return {
    pdbId: pdbId || fileName.replace(/\.[^/.]+$/, '').toUpperCase(),
    title: title || `mmCIF Structure ${pdbId || fileName}`,
    classification: 'Macromolecule',
    experimentalMethod,
    resolution,
    organism: 'Biological Specimen',
    chains: [{ id: 'A', name: 'Polymer Assembly', residueCount: 250, type: 'protein' }],
    ligands: [],
    atomCount: Math.max(roughAtomCount, 500),
    residueCount: Math.round(Math.max(roughAtomCount / 8, 50)),
    fileFormat: 'mmCIF',
    fileSize,
    fileName,
  };
}

/**
 * Common names for typical ligands
 */
function getLigandCommonName(id: string): string {
  const dict: Record<string, string> = {
    HEM: 'Heme group (Fe-protoporphyrin IX)',
    REA: 'All-trans-Retinoic Acid',
    ATP: 'Adenosine Triphosphate',
    ADP: 'Adenosine Diphosphate',
    NAG: 'N-Acetylglucosamine',
    GOL: 'Glycerol',
    SO4: 'Sulfate Ion',
    PO4: 'Phosphate Ion',
    ZN: 'Zinc Ion',
    MG: 'Magnesium Ion',
    CA: 'Calcium Ion',
    FE: 'Iron Ion',
    NAD: 'Nicotinamide Adenine Dinucleotide',
    FAD: 'Flavin Adenine Dinucleotide',
  };
  return dict[id.toUpperCase()] || 'Heteroatom / Chemical Ligand';
}

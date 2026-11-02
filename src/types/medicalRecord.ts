export type ItemStatus = 'active' | 'resolved'
export type AllergySeverity = 'unknown' | 'mild' | 'moderate' | 'severe'
export type MedicationStatus = 'active' | 'suspended'
export type SmokingStatus = 'unknown' | 'never' | 'former' | 'current'
export type AlcoholStatus = 'unknown' | 'none' | 'occasional' | 'frequent'
export type HistorySection = 'personal' | 'family' | 'surgeries' | 'hospitalizations' | 'allergies' | 'medications'
export type HistoryReview = 'unknown' | 'none' | 'recorded'

export interface PersonalHistoryItem {
  id: string
  condition: string
  since?: string
  status: ItemStatus
  notes?: string
}

export interface FamilyHistoryItem {
  id: string
  relative: string
  condition: string
  notes?: string
}

export interface SurgeryItem {
  id: string
  procedure: string
  year?: string
  notes?: string
}

export interface HospitalizationItem {
  id: string
  reason: string
  year?: string
  notes?: string
}

export interface AllergyItem {
  id: string
  substance: string
  reaction?: string
  severity: AllergySeverity
}

export interface MedicationItem {
  id: string
  name: string
  dose?: string
  frequency?: string
  since?: string
  status: MedicationStatus
}

export interface HabitsInfo {
  smoking: SmokingStatus
  alcohol: AlcoholStatus
  exercise_per_week?: number
  sleep_hours?: number
  water_liters?: number
  diet_notes?: string
  other?: string
}

export interface MedicalRecord {
  patient_id: string
  personal: PersonalHistoryItem[]
  family: FamilyHistoryItem[]
  surgeries: SurgeryItem[]
  hospitalizations: HospitalizationItem[]
  allergies: AllergyItem[]
  medications: MedicationItem[]
  habits: HabitsInfo
  updated_at: string
  review_status?: Partial<Record<HistorySection, HistoryReview>>
}


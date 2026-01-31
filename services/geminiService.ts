
import { GoogleGenAI, Type } from "@google/genai";
import { WardrobeItem, StylePreference, Combination, Gender } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const COMBINATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Kombin adı' },
    description: { type: Type.STRING, description: 'Neden bu parçaların seçildiğine dair kısa bir açıklama' },
    itemsIds: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: 'Seçilen kıyafetlerin dolaptaki benzersiz ID listesi'
    },
    stylingTips: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: 'Kullanıcı için stil ipuçları'
    },
    occasion: { type: Type.STRING, description: 'Bu kombinin uygun olduğu ortam' }
  },
  required: ['title', 'description', 'itemsIds', 'stylingTips', 'occasion']
};

/**
 * Utility function to handle API retries with exponential backoff.
 * Especially useful for 429 (Resource Exhausted) errors.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Standard error checking for various SDK versions and response formats
    const isQuotaError = 
      error?.status === 429 || 
      error?.error?.code === 429 || 
      error?.message?.includes('429') || 
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED');
                         
    if (retries > 0 && isQuotaError) {
      console.warn(`Quota reached. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const suggestCombination = async (
  wardrobe: WardrobeItem[],
  style: StylePreference,
  customPrompt: string = "",
  excludeIds: string[] = []
): Promise<Combination> => {
  const availableItems = wardrobe.filter(item => !excludeIds.includes(item.id));
  const itemsContext = availableItems.map(item => ({
    id: item.id,
    category: item.category,
    color: item.color,
    tags: item.tags.join(', ')
  }));

  const prompt = `
    Kullanıcının dijital dolabındaki şu parçaları kullanarak "${style}" tarzında harika bir kombin oluştur.
    
    KULLANICI ÖZEL İSTEĞİ: "${customPrompt}"
    
    ÖNEMLİ KURALLAR:
    1. SADECE aşağıdaki listede verilen 'id' değerlerini kullan.
    2. Kombin mutlaka bir 'Alt Giyim' ve bir 'Üst Giyim' İÇERMELİDİR.
    3. Kullanıcı isteğine (Örn: "beyaz sweet") en uygun rengi ve kategoriyi seç.
    
    Dolaptaki Parçalar Listesi:
    ${JSON.stringify(itemsContext)}
  `;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: COMBINATION_SCHEMA
      }
    });

    const combination: Combination = JSON.parse(response.text);
    // Ensure all returned IDs exist in the current wardrobe
    combination.itemsIds = combination.itemsIds.filter(id => wardrobe.some(item => item.id === id));
    return combination;
  });
};

export const generateModelPreview = async (
  selectedItems: WardrobeItem[],
  style: string,
  gender: Gender,
  customPrompt: string = ""
): Promise<string | null> => {
  const itemDescriptions = selectedItems.map(i => {
    return `a ${i.color} ${i.category} with these details: ${i.tags.join(', ')}`;
  }).join(' and ');

  const modelType = gender === 'Erkek' ? 'stylish male model' : 'stylish female model';
  
  const prompt = `PHOTO-REALISTIC FASHION PHOTOGRAPHY. 
  A ${modelType} posing in a modern setting, specifically styled for a ${style} occasion.
  The model is wearing an EXACT REPLICA of these items:
  ${itemDescriptions}.
  
  CRITICAL REQUIREMENTS:
  - Colors MUST match perfectly (if user uploaded a green shirt, show a green shirt).
  - High-end boutique lighting, sharp focus on fabrics, cinematic 8k look. 
  - NO TEXT OR BADGES ON THE IMAGE.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  });
};

export const analyzeImage = async (base64Data: string): Promise<{category: string, color: string, tags: string[]}> => {
  const prompt = "Bu kıyafet resmini analiz et. Kategori SADECE şunlardan biri olmalı: 'Üst Giyim', 'Alt Giyim', 'Dış Giyim', 'Ayakkabı', 'Aksesuar', 'Elbise'. Ayrıca baskın renk ve stil için 3 etiket ver.";
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            color: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['category', 'color', 'tags']
        }
      }
    });

    return JSON.parse(response.text);
  });
};

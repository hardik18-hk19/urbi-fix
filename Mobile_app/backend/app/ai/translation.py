from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
from typing import Optional
import logging
import torch

logger = logging.getLogger(__name__)

class SimpleTranslator:
    """
    Simplified translator that prioritizes working models over ideal ones.
    """
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.pipe = None
        self.current_model = None
        self.initialized = False

    def _init_model(self):
        """Initialize the best available working model"""
        if self.initialized:
            return
        
        # List of models to try in order of preference
        models_to_try = [
            # Small working models first
            ("google/mt5-small", "mt5"),
            ("facebook/mbart-large-50-one-to-many-mmt", "mbart_simple"),
            ("Helsinki-NLP/opus-mt-mul-en", "helsinki_mul"),
            ("facebook/mbart-large-50-many-to-many-mmt", "mbart_full"),
        ]
        
        for model_name, model_type in models_to_try:
            try:
                logger.info(f"Trying to load {model_name}")
                
                if model_type == "mt5":
                    # Try Google's mT5 (multilingual T5)
                    self.pipe = pipeline("text2text-generation", model=model_name)
                    self.current_model = model_name
                    logger.info(f"Successfully loaded {model_name}")
                    break
                    
                elif model_type in ["mbart_simple", "mbart_full"]:
                    # Try mBART variants
                    self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                    self.model = AutoModelForSeq2SeqLM.from_pretrained(
                        model_name,
                        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
                    )
                    if torch.cuda.is_available():
                        self.model = self.model.cuda()
                    self.current_model = model_name
                    logger.info(f"Successfully loaded {model_name}")
                    break
                    
                elif model_type == "helsinki_mul":
                    # Try Helsinki multilingual model
                    self.pipe = pipeline("translation", model=model_name)
                    self.current_model = model_name
                    logger.info(f"Successfully loaded {model_name}")
                    break
                    
            except Exception as e:
                logger.warning(f"Failed to load {model_name}: {e}")
                continue
        
        if self.current_model is None:
            logger.error("No translation model could be loaded!")
            
        self.initialized = True

    def translate(self, text: str, src_lang: str = "kn", tgt_lang: str = "en") -> str:
        """Translate text using the best available model"""
        if not text.strip():
            return ""
            
        self._init_model()
        
        if self.current_model is None:
            logger.warning("No translation model available, returning original text")
            return text
        
        try:
            # Handle mT5 model (text2text-generation)
            if "mt5" in self.current_model:
                # mT5 expects a specific format
                prompt = f"translate {src_lang} to {tgt_lang}: {text}"
                result = self.pipe(prompt, max_new_tokens=200, truncation=True)
                if result and len(result) > 0:
                    return result[0]['generated_text'].strip()
            
            # Handle mBART models (manual generation)
            elif "mbart" in self.current_model and self.model and self.tokenizer:
                # Language codes for mBART
                lang_codes = {
                    "kn": "kn_IN", "hi": "hi_IN", "ta": "ta_IN", 
                    "te": "te_IN", "gu": "gu_IN", "bn": "bn_IN", 
                    "mr": "mr_IN", "en": "en_XX"
                }
                
                src_code = lang_codes.get(src_lang, "kn_IN")
                tgt_code = lang_codes.get(tgt_lang, "en_XX")
                
                self.tokenizer.src_lang = src_code
                inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=400)
                if hasattr(self.model, 'device') and self.model.device.type != 'cpu':
                    inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
                
                forced_bos_token_id = self.tokenizer.convert_tokens_to_ids(tgt_code)
                with torch.no_grad():
                    outputs = self.model.generate(
                        **inputs,
                        forced_bos_token_id=forced_bos_token_id,
                        max_new_tokens=200,
                        num_beams=3,
                        early_stopping=True,
                        no_repeat_ngram_size=2
                    )
                
                result = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
                return result.strip()
            
            # Handle pipeline models
            elif self.pipe:
                result = self.pipe(text, truncation=True, max_new_tokens=200)
                if isinstance(result, list) and result:
                    return (result[0].get("translation_text") or 
                           result[0].get("generated_text") or "").strip()
                elif isinstance(result, dict):
                    return (result.get("translation_text") or 
                           result.get("generated_text") or "").strip()
        
        except Exception as e:
            logger.error(f"Translation failed: {e}")
        
        # Fallback: return original text
        return text
    
    def get_info(self) -> dict:
        """Get information about current model"""
        return {
            "current_model": self.current_model,
            "initialized": self.initialized,
            "torch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available()
        }

# Test function
def test_simple_translator():
    translator = SimpleTranslator()
    
    test_texts = [
        "ನನ್ನ ಬಾತ್ರೂಮಿನಲ್ಲಿ ಪೈಪ್ ಲೀಕ್ ಆಗಿದೆ, ದಯವಿಟ್ಟು ಸಹಾಯ ಮಾಡಿ",
        "ನಮಸ್ಕಾರ",
        "ಧನ್ಯವಾದ"
    ]
    
    for text in test_texts:
        result = translator.translate(text, src="kn", tgt="en")
        print(f"Original: {text}")
        print(f"Translated: {result}")
        print("-" * 40)
    
    print(f"Model info: {translator.get_info()}")

if __name__ == "__main__":
    test_simple_translator()
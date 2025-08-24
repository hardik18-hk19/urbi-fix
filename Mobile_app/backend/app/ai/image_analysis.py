# backend/app/ai/image_analysis.py
from typing import List, Dict, Optional
from PIL import Image
import io
import torch
from torchvision import transforms, models

# Simple image analysis: classification (ImageNet) + optional object detection (COCO)
# For production you should fine-tune a small model for your categories.

_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
])

class ImageAnalyzer:
    def __init__(self, device: Optional[str] = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.classifier = None
        self.detector = None
        self.labels = None
        self._init_classifier()

    def _init_classifier(self):
        if self.classifier is None:
            # Use a small pretrained classifier for quick signals
            self.classifier = models.mobilenet_v2(pretrained=True).to(self.device).eval()
            # Try to load ImageNet labels from torchvision package data
            try:
                import pkgutil, json
                data = pkgutil.get_data("torchvision", "imagenet_classes.txt")
                if data:
                    self.labels = data.decode("utf-8").splitlines()
                else:
                    self.labels = [f"class_{i}" for i in range(1000)]
            except Exception:
                self.labels = [f"class_{i}" for i in range(1000)]

    def classify(self, file_bytes: bytes, top_k: int = 3) -> List[Dict]:
        """
        Returns list of {"label": str, "score": float}
        """
        try:
            img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            x = _transform(img).unsqueeze(0).to(self.device)
            with torch.no_grad():
                out = self.classifier(x)[0]
                probs = torch.nn.functional.softmax(out, dim=0)
                topk = torch.topk(probs, k=top_k)
                results = []
                for idx, score in zip(topk.indices.cpu().numpy(), topk.values.cpu().numpy()):
                    label = self.labels[idx] if idx < len(self.labels) else f"class_{idx}"
                    results.append({"label": label, "score": float(score)})
                return results
        except Exception:
            return []

    def detect_objects(self, file_bytes: bytes, score_thresh: float = 0.5, max_results:int = 10) -> List[Dict]:
        """
        Optional: detection using fasterrcnn_resnet50_fpn pretrained on COCO.
        This can be heavier; initialize on demand.
        """
        try:
            if self.detector is None:
                self.detector = models.detection.fasterrcnn_resnet50_fpn(pretrained=True).to(self.device).eval()
                # minimal COCO label set (expand as needed)
                self.coco_labels = {
                    1: "person", 2: "bicycle", 3: "car", 4: "motorcycle", 6:"bus", 7:"train",
                    8:"truck", 9:"boat", 16:"bird", 17:"cat", 18:"dog", 44:"bottle", 47:"cup"
                }
            img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            transform = transforms = __import__("torchvision.transforms", fromlist=["transforms"]).transforms
            to_tensor = transforms.ToTensor()
            tensor = to_tensor(img).to(self.device)
            with torch.no_grad():
                preds = self.detector([tensor])[0]
            boxes = preds["boxes"].cpu().numpy()
            scores = preds["scores"].cpu().numpy()
            labels = preds["labels"].cpu().numpy()
            results = []
            for box, score, label in zip(boxes, scores, labels):
                if score < score_thresh:
                    continue
                lbl = self.coco_labels.get(int(label), str(int(label)))
                results.append({"box": [float(x) for x in box.tolist()], "score": float(score), "label": lbl})
                if len(results) >= max_results:
                    break
            return results
        except Exception:
            return []

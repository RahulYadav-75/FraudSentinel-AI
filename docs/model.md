# FraudSentinel AI — Machine Learning Model

## 1. Overview

FraudSentinel AI is a machine-learning-based application designed to identify potentially fraudulent financial transactions.

The trained model is stored in the project as:

`models/fraudsentinel_model.pkl`

The backend can load this model to generate predictions for transaction data, provided the input matches the model's expected feature format.

## 2. Model Artifact

- **File:** `fraudsentinel_model.pkl`
- **Location:** `models/`
- **Format:** Pickle-based model artifact
- **Loading library:** Joblib is included in the project dependencies.

The exact estimator type, training dataset, and preprocessing steps should be confirmed from the model training code or saved artifact.

## 3. Prediction Workflow

1. A user provides transaction information through the frontend.
2. The frontend sends a request to the backend API.
3. The backend validates the request data.
4. The input is prepared in the format expected by the trained model.
5. The model generates a prediction.
6. The backend returns the result to the frontend.
7. The frontend displays the prediction to the user.

## 4. Input Features

The model must receive the same features, in the expected order and data format, that were used during training.

Document the following after checking the actual training pipeline:

- Feature names
- Data types
- Feature ordering
- Missing-value handling
- Categorical encoding
- Numerical scaling, if applicable
- Any other preprocessing steps

Do not assume the model's feature names or input format without checking the implementation.

## 5. Model Evaluation

Model performance should be evaluated using an independent test dataset.

Recommended metrics for fraud detection include:

- **Precision:** Proportion of transactions predicted as fraudulent that are actually fraudulent.
- **Recall:** Proportion of actual fraudulent transactions correctly detected.
- **F1-score:** Harmonic mean of precision and recall.
- **Confusion matrix:** Counts of true positives, false positives, true negatives, and false negatives.
- **PR-AUC:** Useful for evaluating performance when fraud cases are rare.
- **ROC-AUC:** Measures the model's ability to distinguish between the two classes.

Actual metric values should be added only after running and recording the evaluation.

## 6. Fraud Detection Considerations

Fraud detection datasets may be highly imbalanced, with legitimate transactions greatly outnumbering fraudulent ones.

Accuracy alone may therefore provide a misleading view of model performance.

The decision threshold should be selected according to the application's requirements, including the cost of missed fraud and the burden of false alerts.

A prediction should be treated as a risk signal, not definitive proof of fraud.

## 7. Reproducibility

For reproducible predictions:

- Keep preprocessing consistent between training and inference.
- Record the model version and training configuration.
- Track the dataset and evaluation methodology.
- Use compatible Python and library versions.
- Test the model-loading and prediction workflow.
- Avoid loading untrusted pickle files because deserialization can execute malicious code.

## 8. Future Improvements

- Add automated model evaluation tests.
- Track precision and recall across model versions.
- Monitor changes in transaction patterns.
- Add model versioning and reproducible training.
- Evaluate probability calibration where needed.
- Document the decision threshold and its business rationale.

## 9. Verification Checklist

- [ ] Confirm the estimator type.
- [ ] Identify the training dataset.
- [ ] Document the exact input features.
- [ ] Verify preprocessing and feature ordering.
- [ ] Record test-set evaluation metrics.
- [ ] Confirm how the backend loads and uses the model.
- [ ] Test prediction responses and error handling.

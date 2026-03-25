# Multi-Fidelity GP Correction — Tasks

- [x] Generate the synthetic benchmark and data splits [fleet-eligible] [skill: execute]
  Why: The project needs a reproducible target function, a concrete low-fidelity surrogate, and fixed high-fidelity train/test sets before models can be compared.
  Done when: `projects/multi_fidelity_gp/experiments/synthetic-benchmark/` contains the target-function specification, saved high-fidelity train/test data, and a plot showing `f(x)` and `f_LF(x)` over the domain.
  Evidence: `projects/multi_fidelity_gp/experiments/synthetic-benchmark/`
  Priority: high

- [ ] Implement the residual GP correction model [fleet-eligible] [skill: execute]
  Why: The central hypothesis is that modeling the residual `f(x) - f_LF(x)` with a Gaussian process improves predictions without discarding the low-fidelity approximation.
  Done when: A reproducible implementation accepts `f_LF(x)` and high-fidelity training pairs, then returns predictive mean and uncertainty for the corrected model on arbitrary inputs.
  Priority: high

- [ ] Implement comparison baselines (low-fidelity only and high-fidelity-only GP) [fleet-eligible] [skill: execute]
  Why: The correction model is only informative if its gains can be separated from the value of the low-fidelity prior and from a GP trained directly on the same high-fidelity data.
  Done when: The project can produce predictions from `f_LF(x)` alone and from a GP trained directly on high-fidelity observations using the same evaluation inputs as the correction model.
  Priority: high

- [ ] Evaluate accuracy and uncertainty on holdout high-fidelity data [requires-opus] [skill: analyze]
  Why: The project’s research value is the measured trade-off between predictive accuracy and calibrated uncertainty, not the implementation alone.
  Done when: A report or experiment record compares RMSE, MAE, negative log likelihood, interval coverage, and average interval width for all models on a disjoint high-fidelity test set.
  Priority: high

- [ ] Sweep the amount of high-fidelity training data [fleet-eligible] [skill: execute]
  Why: The practical question is when residual correction meaningfully helps under sparse high-fidelity sampling.
  Done when: At least three high-fidelity training-set sizes are evaluated and the resulting accuracy and calibration trends are documented.
  Priority: medium

# Lorenz63 Denoising Evaluation Protocol

Status: adopted
Date: 2026-04-27

## Knowledge output

This protocol is a measurement study. The knowledge goal is to produce method-comparable evidence about how denoising error and variance change with observation noise for Savitzky-Golay filtering and kernel smoothing on on-attractor Lorenz63 trajectories.

## Experiment: Lorenz63 denoising benchmark v1

Hypothesis: Measurement study. Quantities of interest are trajectory-level denoising error, scale-normalized error, and error reduction relative to the noisy input as functions of noise level, method family, and hyperparameter setting.

CI layers: L2 Workflow (trajectory generation, noise injection, method sweeps), L4 Evaluation (metrics, aggregation, tables, plots), L5 Human (choosing the benchmark defaults and interpreting robust-vs-per-noise recommendations).

Variables:
- Independent: relative noise level `alpha in {0.02, 0.05, 0.10, 0.20}`. These four levels span mild to heavy corruption while keeping the first CPU-only sweep small enough to target the project's 20-minute cap.
- Independent: denoising method and hyperparameters. Savitzky-Golay sweeps window length `w in {7, 11, 21, 41}` and polynomial order `p_sg in {2, 3, 5}` with invalid `p_sg >= w` combinations skipped. It is applied independently to each coordinate with `scipy.signal.savgol_filter(y_j, window_length=w, polyorder=p_sg, deriv=0, delta=1.0, mode="interp")`; other edge modes are out of scope for v1. Kernel smoothing uses a coordinate-wise anchor-basis least-squares estimator on the sample-index grid `t in {0, ..., N - 1}`. It sweeps anchor count `M in {32, 64, 128}`, bandwidth multiplier `c_h in {1, 2, 4}` so `h = c_h * (N - 1) / (M - 1)`, kernel type in `{gaussian, compact_polynomial}`, and compact-polynomial exponent `p_k in {2, 3, 4}`.
- Dependent: primary metric `RMSE = sqrt(mean_{t,j} (x_hat_j(t) - x_j(t))^2)`. RMSE is the main ranking metric because it directly measures reconstruction fidelity in the same units as the state variables. It can overweight large-amplitude coordinates, so it is paired with normalized diagnostics below.
- Dependent: secondary metric `relative_RMSE = RMSE / sqrt(mean_{t,j} x_j(t)^2)`. This normalizes error by clean-signal scale so comparisons across noise levels remain interpretable. It shares RMSE's sensitivity to large errors but removes unit dependence.
- Dependent: secondary metric `denoising_gain = 1 - RMSE(x_hat, x) / RMSE(y, x)`. This measures improvement over the noisy observation baseline. It becomes unstable only if the noisy-input RMSE is near zero, which cannot happen at the chosen nonzero noise levels.
- Dependent: diagnostic metric `RMSE_j = sqrt(mean_t (x_hat_j(t) - x_j(t))^2)` for `j in {x, y, z}`. Per-coordinate RMSE is not the ranking metric; it is only used to diagnose coordinate-specific over-smoothing.
- Controlled: Lorenz63 parameters are fixed at `sigma = 10`, `rho = 28`, `beta = 8/3`.
- Controlled: integration uses fixed-step RK4 with `dt = 0.01`.
- Controlled: each clean trajectory uses burn-in length `5000` steps and recorded length `N = 2048` steps.
- Controlled: initial conditions use the same rule for every trajectory seed: `x0 = (1, 1, 1) + 0.1 * Normal(0, I_3)`.
- Controlled: all methods and hyperparameter settings are evaluated on the identical clean/noisy realizations.
- Controlled: the benchmark is CPU-only, and implementations must return denoised trajectories with the same shape as the noisy input so metrics are scored on the full recorded window without method-specific trimming.

Method:
1. Generate `5` clean trajectories using trajectory seeds `0..4`. For each seed, draw the perturbation in `x0 = (1, 1, 1) + 0.1 * Normal(0, I_3)`, integrate for `5000 + 2048` RK4 steps at `dt = 0.01`, discard the first `5000` burn-in steps, and keep the final `2048` samples.
2. For each clean trajectory and coordinate `j`, compute the coordinate scale with the project-standard mean absolute magnitude:
   `scale_j = mean_t |x_j(t)|`.
3. For each clean trajectory seed `s in {0, 1, 2, 3, 4}`, create `2` noisy replicates per noise level indexed by `r in {0, 1}` with unique noise seeds
   `noise_seed(s, r) = 1000 + 2 * s + r`.
   For every `alpha in {0.02, 0.05, 0.10, 0.20}`, generate
   `y_j(t) = x_j(t) + epsilon_j(t)`,
   `epsilon_j(t) ~ Normal(0, (alpha * scale_j)^2)`,
   independent across time, coordinate, and `(trajectory_seed, replicate_id)` pair. This yields `10` noisy realizations per noise level with distinct noise seeds and `40` noisy trajectories in the full v1 benchmark. The two `replicate_id` rows for a fixed `trajectory_seed` share the same clean trajectory and coordinate scales, so they form one outer sampling cluster rather than two fully independent outer replicates.
4. Evaluate every denoising method on the exact same `40` noisy trajectories.
   Savitzky-Golay settings:
   `w in {7, 11, 21, 41}`, `p_sg in {2, 3, 5}`, skip invalid `p_sg >= w`. Apply Savitzky-Golay independently to each coordinate with `scipy.signal.savgol_filter(..., mode="interp")` semantics over the full recorded window; mirror, nearest, wrap, constant, or method-specific padding rules are non-compliant for v1.
   Kernel-smoothing settings:
   `M in {32, 64, 128}`, `c_h in {1, 2, 4}`, `kernel in {gaussian, compact_polynomial}`, `p_k in {2, 3, 4}` for compact-polynomial only.
   For a chosen `M`, define equidistant anchor centers on sample index as
   `tau_m = m * (N - 1) / (M - 1)` for `m in {0, ..., M - 1}`.
   Define the kernel basis on sample index, not physical time, with bandwidth `h = c_h * (N - 1) / (M - 1)`:
   `B_{t,m} = K((t - tau_m) / h)`.
   Use `K(u) = exp(-u^2 / 2)` for the Gaussian kernel.
   Use `K(u) = (1 - u^2)^{p_k}` for `|u| <= 1` and `K(u) = 0` otherwise for the compact-polynomial kernel.
   For each coordinate `j in {x, y, z}` independently, fit coefficients over the full recorded window by ordinary least squares:
   `beta_j in argmin_b sum_t (y_j(t) - sum_m b_m B_{t,m})^2`.
   If multiple minimizers exist, use the minimum-Euclidean-norm solution from the Moore-Penrose pseudoinverse of `B`.
   Define the denoised estimate as
   `x_hat_j(t) = sum_m beta_{j,m} B_{t,m}`.
   No intercept, normalization-by-row-sum, coordinate coupling, or additional regularization is used in v1. Alternative kernel smoothers such as per-time normalized kernel averages are out of scope for this benchmark version.
5. Record one raw-result row per evaluated combination in `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/metrics_raw.csv` with at least:
   `trajectory_seed`, `replicate_id`, `noise_seed`, `alpha`, `method`, hyperparameter fields, `rmse`, `relative_rmse`, `denoising_gain`, `rmse_x`, `rmse_y`, `rmse_z`.
6. Aggregate results into `summary_by_setting.csv` grouped by `{alpha, method, hyperparameters}`. For each metric, report the mean across all `10` raw rows plus a cluster-adjusted sample variance computed over the `5` trajectory-seed cluster means. For cluster `s`, define the per-cluster metric mean as `m_s = (metric_{s,0} + metric_{s,1}) / 2`; then report `variance_cluster = sum_s (m_s - mean_s m_s)^2 / (5 - 1)` with `ddof = 1`. Record both `n_realizations = 10` and `n_clusters = 5`. Any group with `n_realizations < 10` or `n_clusters < 5` is incomplete and must not be used for ranking or recommendation.
7. Produce `best_by_noise.csv` by selecting, for each `{alpha, method}`, the hyperparameter setting with the lowest mean RMSE. Break exact ties by lower mean relative RMSE, then lower cluster-adjusted RMSE variance, then lexicographic hyperparameter order for deterministic reporting.
8. Produce `robust_settings.csv` by selecting one hyperparameter setting per method that minimizes mean `relative_RMSE` averaged equally across the four noise levels, subject to `denoising_gain > 0` at at least `3` of the `4` noise levels.
9. Publish the standard report tables:
   `best_by_noise.csv` rendered as the per-noise recommendation table with columns `alpha`, `method`, selected hyperparameters, mean/cluster-adjusted variance of `RMSE`, mean/cluster-adjusted variance of `relative_RMSE`, mean/cluster-adjusted variance of `denoising_gain`, `n_realizations`, and `n_clusters`.
   `robust_settings.csv` rendered as the cross-noise robustness table with the chosen hyperparameters, their per-noise metric means, and the corresponding `n_clusters`.
10. Publish the standard plots under `modules/smoothing/artifacts/lorenz63-denoising-sweep-v1/plots/`:
    `rmse_vs_noise.png` showing mean RMSE versus `alpha` for the best-per-noise setting of each method with `+/- 1` cluster-level standard deviation error bars derived from the `5` trajectory-seed means.
    `relative_rmse_vs_noise.png` showing mean relative RMSE versus `alpha` for the same selections.
    `denoising_gain_vs_noise.png` showing mean denoising gain versus `alpha`.
11. If the full sweep is expected to run longer than `2` minutes, submit it through `infra/experiment-runner/run.py --detach` with explicit `--artifacts-dir`, `--project-dir`, `--max-retries`, `--watch-csv`, and `--total` flags, then register the experiment with the scheduler API instead of supervising it in-session.

Validity threats:
- Position bias: not applicable. This is not a pairwise human-rating protocol.
- Sample size: v1 uses `5` independent clean trajectories per noise level, each with `2` within-trajectory noise replicates, so uncertainty reporting is based on `5` outer clusters even though each group contains `10` raw rows. This is the minimum cluster count that still permits nontrivial variance estimates within the project's 20-minute CPU budget target. If runtime is too high, shrink the hyperparameter grid before shrinking the number of trajectory seeds.
- Confounds: all methods share the same clean trajectories, noise-generation rule, integration settings, and scoring window. Hyperparameters are compared on identical realization pools. The two replicates within a `trajectory_seed` are correlated through the shared clean trajectory and scale estimates, so v1 controls this by aggregating uncertainty at the trajectory-seed cluster level instead of treating all `10` rows as independent outer samples.
- Construct validity: RMSE-based metrics capture pointwise reconstruction fidelity, not attractor geometry or derivative preservation. The protocol therefore limits its claims to state-space recovery accuracy. A later protocol revision can add dynamics-aware metrics if needed.
- Config fidelity: no production code path exists yet. `projects/smoothing/evaluation_protocol.md` is the source of truth that later generator and benchmark scripts must implement.
- Upstream limitations reviewed: none (no prior experiment outputs consumed).

Cost estimate:
- API calls: none.
- Compute: target `15-20` CPU minutes for the full v1 sweep; smoke runs should be well below `2` minutes.
- Human time: low once the scripts exist; the main manual work is reviewing the summary tables and plots.
- Sessions: multi-session. This design session fixes the protocol; later sessions implement generators/methods and submit the sweep.

Success criteria:
- Confirmed if: the v1 sweep can produce all required raw outputs, the two standard tables, and the three standard plots without changing the protocol, and the outputs support both per-noise and robust-setting recommendations.
- Refuted if: the required realization count or plot/table set cannot be produced within the protocol's runtime and shape constraints, forcing a protocol redesign before results are comparable.
- Ambiguous if: the sweep completes but method rankings remain within the cluster-adjusted uncertainty bands across most noise levels, leaving no stable recommendation even though the protocol itself executed as designed.

## Design rationale

The protocol fixes benchmark defaults that were previously left as placeholders: `dt = 0.01`, burn-in `5000`, recorded length `2048`, noise levels `{0.02, 0.05, 0.10, 0.20}`, and `10` realizations per noise level from `5 x 2` trajectory/replicate replication with unique seeds `1000 + 2 * trajectory_seed + replicate_id`. I kept the realization count moderate because the project's first benchmark is explicitly CPU-only and capped at roughly 20 minutes, but I changed uncertainty reporting to operate on the `5` trajectory-seed clusters because the paired replicates share the same clean signal.

I retained RMSE as the primary ranking metric because the project's mission is clean-trajectory recovery, but I rejected a single-metric design. Relative RMSE and denoising gain are required so the report can distinguish "small absolute error because the signal scale is small" from genuine improvement over the noisy input.

For Savitzky-Golay, I rejected leaving the boundary rule implicit. Window length and polynomial order alone do not determine the output near the ends of the trajectory, so v1 now fixes SciPy's `mode="interp"` semantics as part of the protocol rather than treating edge handling as an implementation detail.

For kernel smoothing, I rejected leaving the estimator family implicit. The v1 benchmark now means one specific procedure: kernels on sample index, `M` equidistant anchor centers, a shared basis matrix across coordinates, and coordinate-wise least-squares coefficient fitting without row normalization or extra regularization. That choice matches the project's original "full signal using `M < N` anchors" intent while removing ambiguity between materially different smoothing algorithms.

For robust recommendations, I rejected "pick the globally lowest RMSE at one noise level" because it would overfit the noisiest or easiest regime. Averaging relative RMSE equally across noise levels forces the robust-setting recommendation to reflect cross-noise stability rather than one regime's amplitude scale.

# Data Compression Benchmark

Status: active
Mission: Evaluate the compression rate versus recovery accuracy trade-off in two typical dimension reduction algorithms: Principle Component Analysis (PCA), and Tensor Train Decomposition (TTD).
Done when: Published benchmark with compression rate and accuracy comparison for the two algorithms, benchmark on a synthesized grayscale video-like data (so the raw data is three-dimensional), demonstrated trade-off in compression rate and accuracy against hyperparameters in the algorithms, and a recommended evaluation protocol.

## Context

PCA has received success in dimension reduction of structured data.  However, for data arrays of more than two dimensions, PCA would cast them into two dimensions and perform the compression.  Leveraging the multiple dimensions, such as in TTD, it may be possible to achieve higher compression rate at the same level of recovery accuracy.  This project compares PCA and TTD in the dimension reduction of video-like data array.

The goal is to answer: how much improvement in data compression can TTD achieve when compared to PCA, and what are the trade off of such improvement?

## Log


## Open questions

- How to devise the synthesized dataset to differentiate the performance of the two algorithms.
- Which set of metrics are the most concise to showcase the trade-off in PCA vs. TTD?

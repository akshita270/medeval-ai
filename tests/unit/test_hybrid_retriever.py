from app.retrieval.hybrid_retriever import reciprocal_rank_fusion


def test_item_ranked_well_in_both_lists_beats_item_ranked_first_in_only_one():
    # A is rank 1 in dense but absent from BM25; B is rank 2 in dense and
    # rank 1 in BM25 -- B should win the fused ranking.
    dense = ["A", "B", "D"]
    bm25 = ["B", "C", "A"]

    scores = reciprocal_rank_fusion([dense, bm25])

    assert scores["B"] > scores["A"]


def test_fused_score_matches_hand_computed_formula():
    scores = reciprocal_rank_fusion([["A", "B"], ["B", "C"]], k=60)

    assert abs(scores["A"] - 1 / 61) < 1e-9  # rank 1 in list 1 only
    assert abs(scores["B"] - (1 / 62 + 1 / 61)) < 1e-9  # rank 2 in list 1, rank 1 in list 2
    assert abs(scores["C"] - 1 / 62) < 1e-9  # rank 2 in list 2 only


def test_item_absent_from_a_ranking_contributes_zero_from_it():
    scores = reciprocal_rank_fusion([["A"], []])
    assert scores == {"A": 1 / 61}


def test_empty_rankings_produce_no_scores():
    assert reciprocal_rank_fusion([[], []]) == {}

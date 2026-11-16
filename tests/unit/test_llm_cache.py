from app.config import Settings
from app.llm_cache import cached_call, get_cache_for_settings, get_llm_cache, make_cache_key


def _settings(tmp_path, **overrides) -> Settings:
    defaults = dict(
        openai_api_key="test",
        llm_model="gpt-5-mini",
        embedding_model="text-embedding-3-small",
        judge_model="gpt-5-mini",
        prompt_version="v1",
        chunk_size=800,
        chunk_overlap=100,
        retrieval_top_k=5,
        llm_cache_enabled=True,
        llm_cache_db_path=tmp_path / "cache.db",
    )
    defaults.update(overrides)
    return Settings(**defaults)


class TestMakeCacheKey:
    def test_same_inputs_produce_the_same_key(self):
        assert make_cache_key("a", "b", 1) == make_cache_key("a", "b", 1)

    def test_different_inputs_produce_different_keys(self):
        assert make_cache_key("a", "b") != make_cache_key("a", "c")

    def test_part_order_matters(self):
        # Order can change what a real prompt says (e.g. retrieved
        # passage order) -- the key must reflect that, not normalize it away.
        assert make_cache_key(["x", "y"]) != make_cache_key(["y", "x"])

    def test_dict_key_order_within_a_part_does_not_matter(self):
        assert make_cache_key({"a": 1, "b": 2}) == make_cache_key({"b": 2, "a": 1})


class TestLLMCache:
    def test_miss_returns_none(self, tmp_path):
        cache = get_llm_cache(str(tmp_path / "a.db"))
        assert cache.get("nonexistent") is None

    def test_set_then_get_returns_the_value(self, tmp_path):
        cache = get_llm_cache(str(tmp_path / "b.db"))
        cache.set("key1", {"answer": "hello", "tokens": 42})
        assert cache.get("key1") == {"answer": "hello", "tokens": 42}

    def test_set_overwrites_an_existing_key(self, tmp_path):
        cache = get_llm_cache(str(tmp_path / "c.db"))
        cache.set("key1", {"v": 1})
        cache.set("key1", {"v": 2})
        assert cache.get("key1") == {"v": 2}

    def test_persists_across_separate_cache_objects_pointing_at_the_same_file(self, tmp_path):
        db_path = tmp_path / "d.db"
        get_llm_cache.cache_clear()
        cache_a = get_llm_cache(str(db_path))
        cache_a.set("key1", {"v": "persisted"})
        get_llm_cache.cache_clear()  # force a fresh LLMCache/connection, same file
        cache_b = get_llm_cache(str(db_path))
        assert cache_b.get("key1") == {"v": "persisted"}


class TestGetCacheForSettings:
    def test_returns_none_when_disabled(self, tmp_path):
        settings = _settings(tmp_path, llm_cache_enabled=False)
        assert get_cache_for_settings(settings) is None

    def test_returns_a_cache_when_enabled(self, tmp_path):
        settings = _settings(tmp_path)
        assert get_cache_for_settings(settings) is not None


class TestCachedCall:
    def test_none_cache_always_calls_compute(self):
        calls = []

        def compute():
            calls.append(1)
            return {"v": "fresh"}

        result1, hit1 = cached_call(None, ("k",), compute)
        result2, hit2 = cached_call(None, ("k",), compute)

        assert len(calls) == 2  # never cached when cache is None
        assert hit1 is False
        assert hit2 is False
        assert result1 == result2 == {"v": "fresh"}

    def test_second_identical_call_is_a_cache_hit_and_skips_compute(self, tmp_path):
        cache = get_llm_cache(str(tmp_path / "e.db"))
        calls = []

        def compute():
            calls.append(1)
            return {"v": "computed-once"}

        result1, hit1 = cached_call(cache, ("same", "key"), compute)
        result2, hit2 = cached_call(cache, ("same", "key"), compute)

        assert len(calls) == 1  # compute() only ran on the first call
        assert hit1 is False
        assert hit2 is True
        assert result1 == result2 == {"v": "computed-once"}

    def test_different_key_parts_do_not_share_a_cache_entry(self, tmp_path):
        cache = get_llm_cache(str(tmp_path / "f.db"))
        calls = []

        def compute():
            calls.append(1)
            return {"v": len(calls)}

        cached_call(cache, ("key-a",), compute)
        cached_call(cache, ("key-b",), compute)

        assert len(calls) == 2

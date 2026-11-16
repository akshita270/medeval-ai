from app.guardrails.pii_guardrails import check_patient_identifier
from app.guardrails.schema import GuardrailAction


class TestCheckPatientIdentifier:
    def test_allows_normal_research_question(self):
        result = check_patient_identifier("What are the major risk factors for type 2 diabetes?")
        assert result.action == GuardrailAction.ALLOW

    def test_allows_general_dosing_question(self):
        result = check_patient_identifier("What is the recommended starting dose of metformin?")
        assert result.action == GuardrailAction.ALLOW

    def test_blocks_ssn_pattern(self):
        result = check_patient_identifier("My patient's SSN is 123-45-6789, what should I check?")
        assert result.action == GuardrailAction.BLOCK
        assert result.check_name == "patient_identifier"

    def test_blocks_mrn_pattern(self):
        result = check_patient_identifier("Patient MRN: 00482913 has elevated HbA1c.")
        assert result.action == GuardrailAction.BLOCK

    def test_blocks_date_of_birth_pattern(self):
        result = check_patient_identifier("DOB: 04/12/1980, recently diagnosed with T2D.")
        assert result.action == GuardrailAction.BLOCK

    def test_blocks_email_address(self):
        result = check_patient_identifier("Please send results to jane.doe@example.com.")
        assert result.action == GuardrailAction.BLOCK

    def test_blocks_phone_number(self):
        result = check_patient_identifier("Call the patient back at 555-123-4567.")
        assert result.action == GuardrailAction.BLOCK

    def test_does_not_flag_a_drug_or_condition_name(self):
        # Format-based, not name-based -- ordinary research vocabulary
        # (drug names, condition names) must never trip this check.
        result = check_patient_identifier("Dapagliflozin is an SGLT2 inhibitor used in type 2 diabetes mellitus.")
        assert result.action == GuardrailAction.ALLOW

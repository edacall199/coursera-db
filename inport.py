import json
import os

def main():
    # Đọc file import.json
    with open("import.json", "r", encoding="utf-8") as f:
        import_data = json.load(f)

    source = import_data.get("Source")
    data_to_import = import_data.get("Data", [])

    target_file = f"{source}.json"

    if not os.path.exists(target_file):
        print(f"⚠️ Không tìm thấy file {target_file}")
        return

    # Đọc dữ liệu của source.json
    with open(target_file, "r", encoding="utf-8") as f:
        source_data = json.load(f)

    # Đảm bảo có trường quizSrc
    if "quizSrc" not in source_data or not isinstance(source_data["quizSrc"], list):
        source_data["quizSrc"] = []

    quiz_list = source_data["quizSrc"]

    # Tạo dict để tra cứu nhanh theo term
    existing_terms = {item["term"]: item for item in quiz_list if "term" in item}

    for item in data_to_import:
        term = item.get("term")
        definition = item.get("definition")

        if not term:
            continue  # bỏ qua nếu thiếu dữ liệu

        if term in existing_terms:
            # Nếu đã có câu hỏi thì update đáp án nếu khác
            if existing_terms[term].get("definition") != definition:
                print(f"🔄 Update đáp án cho câu: {term}")
                existing_terms[term]["definition"] = definition
        else:
            # Nếu chưa có thì thêm mới
            print(f"➕ Thêm câu hỏi mới: {term}")
            quiz_list.append(item)
            existing_terms[term] = item

    # Ghi lại file (giữ nguyên cấu trúc quizSrc)
    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(source_data, f, ensure_ascii=False, indent=2)

    print(f"✅ Import hoàn tất vào {target_file}")

if __name__ == "__main__":
    main()
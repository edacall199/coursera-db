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

    if "Data" not in source_data:
        source_data["Data"] = []

    # Tạo dict để dễ tra cứu nhanh theo term
    existing_terms = {item["term"]: item for item in source_data["Data"]}

    for item in data_to_import:
        term = item.get("term")
        definition = item.get("definition")

        if term in existing_terms:
            # Nếu đã có câu hỏi
            if existing_terms[term]["definition"] != definition:
                print(f"🔄 Update đáp án cho câu: {term}")
                existing_terms[term]["definition"] = definition
        else:
            # Nếu chưa có câu hỏi
            print(f"➕ Thêm câu hỏi mới: {term}")
            source_data["Data"].append(item)
            existing_terms[term] = item

    # Ghi lại file
    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(source_data, f, ensure_ascii=False, indent=2)

    print(f"✅ Import hoàn tất vào {target_file}")

if __name__ == "__main__":
    main()

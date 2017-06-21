# encoding: utf-8
## compute_input.py
import pickle
from natto import MeCab
import sys, json, numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

#Read data from stdin
def read_in():
    lines = sys.stdin.readlines()
    #Since our input would only be having one line, parse our JSON data from that
    return json.loads(lines[0])

# vectorizerで用いる
def tokenize(text):
    tokens = []
    with MeCab('-F%f[0],%f[6]') as nm:
        for n in nm.parse(text, as_nodes=True):
            # ignore any end-of-sentence nodes
            if not n.is_eos() and n.is_nor():
                klass, word = n.feature.split(',', 1)
                if klass in ['名詞', '形容詞', '形容動詞', '動詞']:
                    tokens.append(word)

    return tokens

def main():
    #get our data as an array from read_in()
    lines = read_in()

    #create a numpy array
    input_data = np.array(lines)
    #print(input_data)
    # カテゴリ値とカテゴリ名の対応
    categories = {
        1 : "women",
        2 : "IT",
        3 : "men",
        4 : "movie",
        5 : "sports",
        6 : "misc"
    }

    # vectorizerのロード
   #vectorizer = pickle.load(open("vectorizer.pkl", "rb"))
    vectorizer = pickle.load(open("vectorizer_latest.pkl", "rb"))
    # 学習済みモデルのロード
   #clf = pickle.load(open("model.pkl", "rb"))
    clf = pickle.load(open("model_latest.pkl", "rb"))
    # 特徴ベクトルに変換
    input_matrix = vectorizer.transform(input_data)
    # カテゴリ予測　返り値はカテゴリ値
    categoriesNum = clf.predict(input_matrix)
    # カテゴリ値 -> カテゴリ名に変換
    categoriesName = []
    for i in categoriesNum:
        categoriesName.append(categories[i])
    # カテゴリ名を返す
    print(categoriesName)

    #return the sum to the output stream
    #print lines_sum

#start process
if __name__ == '__main__':
    main()
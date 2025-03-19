const axios = require('axios');

class DeepseekService {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        this.apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
    }

    async generateSQL(prompt, databaseSchema) {
        try {
            const systemPrompt = `You are an expert SQL developer. Your task is to convert natural language queries into SQL statements.
            Given the following database schema:
            ${JSON.stringify(databaseSchema, null, 2)}
            
            Please convert the following natural language query into a valid SQL statement.
            Only return the SQL statement without any explanation.`;

            const response = await axios.post(
                this.apiEndpoint,
                {
                    model: "deepseek-coder",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 1000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error generating SQL:', error);
            if (error.response && error.response.status === 402) {
                throw new Error('DeepSeek账户余额不足。请在DeepSeek平台上充值后再试。可访问：https://platform.deepseek.com/top_up');
            } else if (error.response && error.response.status === 401) {
                throw new Error('DeepSeek API密钥无效。请检查您的API密钥是否正确。');
            } else if (error.response && error.response.status) {
                throw new Error(`DeepSeek API错误(${error.response.status}): ${error.response.data?.error?.message || '未知错误'}`);
            } else {
                throw new Error('生成SQL查询失败');
            }
        }
    }

    async validateSQL(sql, databaseSchema) {
        try {
            const systemPrompt = `You are an expert SQL developer. Your task is to validate the following SQL query and suggest improvements if necessary.
            Given the following database schema:
            ${JSON.stringify(databaseSchema, null, 2)}
            
            Please analyze this SQL query:
            ${sql}
            
            Return a JSON object with the following structure:
            {
                "isValid": boolean,
                "errors": string[] | null,
                "suggestions": string[] | null,
                "improvedQuery": string | null
            }`;

            const response = await axios.post(
                this.apiEndpoint,
                {
                    model: "deepseek-coder",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: "Please validate this query." }
                    ],
                    temperature: 0.1,
                    max_tokens: 1000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const responseContent = response.data.choices[0].message.content;
            
            try {
                // 尝试解析JSON
                return JSON.parse(responseContent);
            } catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                console.log('Raw response content:', responseContent);
                
                // 返回一个基本的验证结果而不是抛出错误
                return {
                    isValid: true,
                    errors: null,
                    suggestions: ["无法解析AI返回的JSON格式。请检查SQL语法。"],
                    improvedQuery: sql
                };
            }
        } catch (error) {
            console.error('Error validating SQL:', error);
            if (error.response && error.response.status === 402) {
                throw new Error('DeepSeek账户余额不足。请在DeepSeek平台上充值后再试。可访问：https://platform.deepseek.com/top_up');
            } else if (error.response && error.response.status === 401) {
                throw new Error('DeepSeek API密钥无效。请检查您的API密钥是否正确。');
            } else if (error.response && error.response.status) {
                throw new Error(`DeepSeek API错误(${error.response.status}): ${error.response.data?.error?.message || '未知错误'}`);
            } else {
                throw new Error('SQL验证失败');
            }
        }
    }
}

module.exports = new DeepseekService(); 